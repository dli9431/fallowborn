/* Fallowborn — reusable road encounters and destination capstones. */
window.FBDATA = window.FBDATA || {};
FBDATA.events = FBDATA.events || [];

FBDATA.events.push(
/* ---------- culture mismatch archetypes ---------- */
{ id:'travel_culture_language', title:'A Word Mislaid', trigger:{never:true},
  travel:{kind:'culture'},
  text:'In {location}, a familiar gesture draws blank faces, and your careful words land with quite another meaning.',
  options:[
    { label:'Listen before speaking.', desc:'Patience teaches what confidence cannot.',
      effects:{skills:{dip:1}} },
    { label:'Laugh at the mistake.', desc:'Shared embarrassment becomes shared good humor.',
      effects:{prestige:2} }
  ]},
{ id:'travel_culture_table', title:'At a Stranger’s Table', trigger:{never:true},
  travel:{kind:'culture'},
  text:'The food in {location} is served in an order you do not know, under table customs everyone else learned as children.',
  options:[
    { label:'Follow your host’s hands.', desc:'Observation keeps offense from the table.',
      effects:{skills:{lea:1}} },
    { label:'Taste everything offered.', desc:'Courage is sometimes measured by the spoonful.',
      effects:{health:1, prestige:1} }
  ]},
{ id:'travel_culture_weights', title:'The Measure of a Market', trigger:{never:true},
  travel:{kind:'culture'},
  text:'A merchant in {location} names weights, measures, and a price custom unlike any used at home.',
  options:[
    { label:'Set every measure side by side.', desc:'Stewardship makes a common language.',
      effects:{skills:{ste:1}, gold:1} },
    { label:'Pay for the lesson.', desc:'A small loss buys useful knowledge.',
      effects:{gold:-1, skills:{lea:1}} }
  ]},
{ id:'travel_culture_worship', title:'Across a Sacred Boundary', trigger:{never:true},
  travel:{kind:'culture'},
  text:'A threshold in {location} is sacred in ways no one thought to explain. A keeper quietly stops you before you cross it wrongly.',
  options:[
    { label:'Ask the proper observance.', desc:'Reverence travels better than certainty.',
      effects:{piety:3, skills:{lea:1}} },
    { label:'Withdraw with thanks.', desc:'Respect needs no perfect understanding.',
      effects:{piety:2} }
  ]},
{ id:'travel_culture_hospitality', title:'The Debt of a Welcome', trigger:{never:true},
  travel:{kind:'culture'},
  text:'Hospitality in {location} comes with obligations left artfully unspoken. Your host waits to see whether you understand.',
  options:[
    { label:'Return the courtesy generously.', desc:'A gift completes the bond.',
      effects:{gold:-2, prestige:4, skills:{dip:1}} },
    { label:'Offer service in place of coin.', desc:'Useful hands are welcome in any tongue.',
      effects:{prestige:2, skills:{ste:1}} }
  ]},
{ id:'travel_culture_law', title:'Cloth, Rank, and Custom', trigger:{never:true},
  travel:{kind:'culture'},
  text:'In {location}, your dress announces a station you do not hold, and a local officer explains the law before someone less patient does.',
  options:[
    { label:'Dress as local custom requires.', desc:'Adaptation is cheaper than pride.',
      effects:{gold:-1, skills:{dip:1}} },
    { label:'Explain your true standing.', desc:'A clear account may carry the day.',
      chance:'skill_dip',
      success:{text:'The officer accepts the explanation and waves you on.',
        effects:{prestige:3}},
      failure:{text:'The explanation becomes a fine and a long lecture.',
        effects:{gold:-3}} }
  ]},

/* ---------- ordinary road incidents ---------- */
{ id:'travel_road_weather', title:'Weather on the Road', trigger:{never:true},
  travel:{kind:'road'},
  text:'Hard weather closes around the road outside {location}; every rut fills and every mile lengthens.',
  options:[
    { label:'Find shelter and wait it out.', desc:'A dry night is worth a delayed dawn.',
      effects:{health:1} },
    { label:'Press through it.', desc:'Keep the road, whatever the sky says.',
      effects:{health:-1, prestige:2} }
  ]},
{ id:'travel_road_lodging', title:'The Last Bed', trigger:{never:true},
  travel:{kind:'road'},
  text:'At {location}, one bed remains beneath a sound roof. The price rises while you stand in the doorway.',
  options:[
    { label:'Pay for the bed. ({money:2})', desc:'Warmth, straw, and a barred door.',
      effects:{gold:-2, health:1} },
    { label:'Sleep beneath your cloak.', desc:'The ditch asks no coin.',
      effects:{} }
  ]},
{ id:'travel_road_toll', title:'A Rope Across the Road', trigger:{never:true},
  travel:{kind:'road'},
  text:'Men with a painted board have stretched a rope across the road near {location}. They call the demand an ancient toll.',
  options:[
    { label:'Pay and pass. ({money:2})', desc:'Some arguments cost more than the answer.',
      effects:{gold:-2} },
    { label:'Question how ancient it is.', desc:'Accounts and confidence against cudgels.',
      chance:'skill_ste',
      success:{text:'Their figures collapse under examination, and so does the toll.',
        effects:{skills:{ste:1}, prestige:2}},
      failure:{text:'The toll doubles while the cudgels remain persuasive.',
        effects:{gold:-4}} }
  ]},
{ id:'travel_road_bandits', title:'Shapes in the Hedgerow', trigger:{never:true},
  travel:{kind:'road'},
  text:'Beyond {location}, armed shapes step into the road and ask for your purse with studied politeness.',
  options:[
    { label:'Slip away through the brush.', desc:'Cunning against watchful eyes.',
      chance:'skill_int',
      success:{text:'Their curses fade behind you while your purse stays put.',
        effects:{skills:{int:1}, prestige:2}},
      failure:{text:'They catch you in the thorns and take what they can.',
        effects:{gold:-5, health:-1}} },
    { label:'Give up a few coins.', desc:'Better a lighter purse than an early grave.',
      effects:{gold:-3} }
  ]},
{ id:'travel_road_illness', title:'Road Fever', trigger:{never:true},
  travel:{kind:'road'},
  text:'A chill takes hold after leaving {location}. By nightfall, the road sways even when you stand still.',
  options:[
    { label:'Rest and drink what the healer gives.', desc:'Bitter herbs and a day beneath blankets.',
      effects:{gold:-2, health:1} },
    { label:'Keep moving.', desc:'The body may follow where will leads.',
      effects:{health:-1} }
  ]},

/* ---------- destination capstones ---------- */
{ id:'travel_capstone_pilgrimage', title:'At the Holy Place', trigger:{never:true},
  travel:{kind:'capstone', purpose:'pilgrimage'},
  text:'After the long road, {destination} stands before you. Dust, fatigue, and all the miles fall quiet at the sacred threshold.',
  options:[
    { label:'Complete the pilgrimage.', desc:'Pray, give thanks, and carry the road’s mark home.',
      effects:{piety:30, prestige:10, health:-1, addTrait:'pilgrim',
        custom:'travel_capstone_done', log:'Completed a pilgrimage to {destination}.'} }
  ]},
{ id:'travel_capstone_trade', title:'The Venture’s Reckoning', trigger:{never:true},
  travel:{kind:'capstone', purpose:'trade'},
  text:'The markets of {destination} are ready. Your stake can be turned quickly and safely, or risked on the bargain you came all this way to make.',
  options:[
    { label:'Take the cautious return.', desc:'Recover the stake with a modest profit.',
      effects:{skills:{ste:1}, custom:'travel_trade_cautious',
        log:'Closed a cautious venture in {destination}.'} },
    { label:'Press the great bargain.', desc:'Your Stewardship decides whether the venture prospers.',
      chance:'travel_trade',
      success:{text:'Every weight, promise, and delivery falls into place. The venture returns handsomely.',
        effects:{prestige:8, skills:{ste:1}, custom:'travel_trade_bold_success',
          log:'Won a rich bargain in {destination}.'}},
      failure:{text:'A hidden fee and a spoiled consignment consume nearly all the stake.',
        effects:{custom:'travel_trade_bold_failure',
          log:'The venture in {destination} barely returned a coin.'}} }
  ]},
{ id:'travel_capstone_study', title:'Lessons Worth the Road', trigger:{never:true},
  travel:{kind:'capstone', purpose:'study'},
  text:'In {destination}, masters preserve methods and books unknown at home. You may follow learning for its own sake or bring sharper craft back to your profession.',
  options:[
    { label:'Devote yourself to learning.', desc:'Return with a broader and better-trained mind.',
      effects:{skills:{lea:2}, prestige:4, custom:'travel_capstone_done',
        log:'Studied with the masters of {destination}.'} },
    { label:'Advance your calling.', desc:'Train the skill and experience used in your present career.',
      effects:{custom:'travel_study_career',
        log:'Advanced a profession in {destination}.'} }
  ]},
{ id:'travel_capstone_service', title:'Service at a Foreign Court', trigger:{never:true},
  travel:{kind:'capstone', purpose:'service'},
  text:'At {destination}, the court has work for an able outsider. Service in hall and office is open to you; the warband judges by older rules.',
  options:[
    { label:'Take service in the court.', desc:'Earn wages, polish, and useful notice.',
      effects:{gold:10, prestige:8, skills:{dip:1,ste:1},
        custom:'travel_capstone_done', log:'Served at the court in {destination}.'} },
    { label:'Join the warband.', desc:'Martial service is open only to an eligible man.',
      require:{sex:'m'},
      effects:{gold:12, prestige:12, skills:{mar:2},
        custom:'travel_capstone_done', log:'Served in the warband at {destination}.'} }
  ]},
{ id:'travel_capstone_relationship', title:'The Visit Begins', trigger:{never:true},
  travel:{kind:'capstone', purpose:'relationship'},
  text:'At last you reach {destination}, where {visitname} receives you in person. The miles no longer stand between conversation and intent.',
  options:[
    { label:'Begin the visit.', desc:'Remain nearby and give the relationship your daily attention.',
      effects:{custom:'travel_capstone_done',
        log:'Began a personal visit with {visitname} in {destination}.'} }
  ]},
{ id:'travel_patron_gone', title:'The Patron Is Gone', trigger:{never:true},
  travel:{kind:'capstone', purpose:'service'},
  text:'You reach {destination}, but the court that promised service has vanished—conquered, scattered, or moved beyond your reach.',
  options:[
    { label:'Accept what the road has brought.', desc:'There is no patron left to pay you.',
      effects:{prestige:2, custom:'travel_capstone_done',
        log:'Reached {destination} after its patron was gone.'} }
  ]},

/* ---------- staying and working at the destination ---------- */
{ id:'travel_arrival_choice', title:'A Season in a New Place', trigger:{never:true},
  travel:{kind:'decision'},
  text:'Your purpose in {destination} is complete, but a traveler cannot know a place in a day. You will stay and find local work for at least three months before choosing the road home.',
  options:[
    { label:'Find work and lodging.', desc:'Time will pass normally, with local work stories while you remain.',
      effects:{log:'Began a season of work in {destination}.'} }
  ]},
{ id:'travel_arrival_choice_relationship', title:'A Season as a Guest', trigger:{never:true},
  travel:{kind:'decision', purpose:'relationship'},
  text:'A meaningful visit cannot be hurried. You will remain near {visitname} for at least three months, sharing the ordinary days in which Standing is won.',
  options:[
    { label:'Stay as their guest.', desc:'Time passes normally, and personal attention advances while you remain together.',
      effects:{log:'Began an extended visit with {visitname} in {destination}.'} }
  ]},
{ id:'travel_arrival_choice_ruler', title:'Residence Away from Home', trigger:{never:true},
  travel:{kind:'decision'},
  text:'Your purpose in {destination} is complete, but rank makes this a courtly residence rather than a search for wages. You will remain as an honored guest for at least three months before taking the road home.',
  options:[
    { label:'Take up guest quarters.', desc:'Time passes normally, with court and household stories while you remain.',
      effects:{log:'Began a season in residence at {destination}.'} }
  ]},
{ id:'travel_work_board', title:'Board Earned at Dusk', trigger:{never:true},
  travel:{kind:'work', maxTier:2},
  text:'A household in {destination} needs another pair of hands. The work is ordinary, but so are bread, a dry corner, and being expected tomorrow.',
  options:[
    { label:'Take the wage in coin.', desc:'Work hard, keep your distance, and add to the purse.',
      effects:{gold:3} },
    { label:'Take board and goodwill.', desc:'Live better and become a familiar face.',
      effects:{health:1, prestige:1} }
  ]},
{ id:'travel_work_neighbors', title:'Known in the Lane', trigger:{never:true},
  travel:{kind:'work', maxTier:2},
  text:'People in {destination} have begun to greet you before asking who you are. A neighbor offers work that comes with conversation and obligations.',
  options:[
    { label:'Learn how things are done here.', desc:'Local habits sharpen your judgment of people.',
      effects:{skills:{dip:1}} },
    { label:'Make yourself useful.', desc:'Practice your calling and earn a place in the day’s work.',
      effects:{custom:'travel_work_career'} }
  ]},
{ id:'travel_work_pilgrimage', title:'Work at the Pilgrim House', trigger:{never:true},
  travel:{kind:'work', purpose:'pilgrimage', maxTier:2},
  text:'The pilgrim house in {destination} never lacks for tired feet, empty bowls, and names that must be entered correctly.',
  options:[
    { label:'Carry water and tend the weary.', desc:'Service keeps the journey’s purpose alive.',
      effects:{piety:3, prestige:1} },
    { label:'Keep the house accounts.', desc:'Order feeds more travelers than good intentions alone.',
      effects:{skills:{ste:1}, gold:1} }
  ]},
{ id:'travel_work_trade', title:'Work Between the Stalls', trigger:{never:true},
  travel:{kind:'work', purpose:'trade', maxTier:2},
  text:'A broker in {destination} needs someone who can watch a delivery, remember a promise, and recognize a false weight.',
  options:[
    { label:'Take a commission on the delivery.', desc:'Careful work brings a modest return.',
      effects:{gold:4} },
    { label:'Study every weight and bargain.', desc:'Learn the market rather than merely passing through it.',
      effects:{skills:{ste:1}, prestige:1} }
  ]},
{ id:'travel_work_study', title:'Work Beneath the Lectern', trigger:{never:true},
  travel:{kind:'work', purpose:'study', maxTier:2},
  text:'The masters in {destination} need pages copied, younger pupils corrected, and lamps watched long after respectable people sleep.',
  options:[
    { label:'Copy the difficult pages.', desc:'Slow work fixes the lesson in memory.',
      effects:{skills:{lea:1}} },
    { label:'Tutor a younger pupil.', desc:'Teaching pays a little and tests whether you truly understand.',
      effects:{gold:2, skills:{dip:1}} }
  ]},
{ id:'travel_work_service', title:'Work Beyond the Hall', trigger:{never:true},
  travel:{kind:'work', purpose:'service', maxTier:2},
  text:'The hall in {destination} has endless work below the notice of great people: stores to count, messages to carry, and disputes to calm.',
  options:[
    { label:'Set the stores in order.', desc:'Reliable service earns wages and sharper stewardship.',
      effects:{gold:3, skills:{ste:1}} },
    { label:'Carry messages between households.', desc:'Become known as someone who arrives with the right words.',
      effects:{prestige:2, skills:{dip:1}} }
  ]},
{ id:'travel_work_relationship_days', title:'Days in Company', trigger:{never:true},
  travel:{kind:'work', purpose:'relationship'},
  text:'Life beside {visitname} in {destination} settles into meals, errands, conversations, and companionable silences that no letter could have carried.',
  options:[
    { label:'Listen closely.', desc:'Let familiarity grow through attention rather than display.',
      effects:{skills:{dip:1}} },
    { label:'Share the day’s burdens.', desc:'Practical help makes the visit part of ordinary life.',
      effects:{prestige:1, health:1} }
  ]},
{ id:'travel_work_relationship_household', title:'A Place in the Household', trigger:{never:true},
  travel:{kind:'work', purpose:'relationship'},
  text:'Those around {visitname} now make room for you without ceremony. Their ease says the visit has become part of the household’s rhythm.',
  options:[
    { label:'Honor their confidence.', desc:'Good manners preserve what daily closeness has built.',
      effects:{prestige:2} },
    { label:'Join the conversation.', desc:'Practice finding the words that bring people nearer.',
      effects:{skills:{dip:1}} }
  ]},
{ id:'travel_residence_court', title:'An Evening at Court', trigger:{never:true},
  travel:{kind:'work', minTier:3},
  text:'The court at {destination} draws you into an evening of petitions, precedence, and carefully measured hospitality.',
  options:[
    { label:'Attend to the petitions.', desc:'Another ruler’s business sharpens your judgment.',
      effects:{skills:{ste:1}} },
    { label:'Honor the host’s table.', desc:'Courtly ease brings notice without turning the visit into service.',
      effects:{prestige:3, skills:{dip:1}} }
  ]},
{ id:'travel_residence_household', title:'Guest Right', trigger:{never:true},
  travel:{kind:'work', minTier:3},
  text:'Your hosts in {destination} renew the forms of guest right: quarters, table, escort, and the expectation that generosity will be remembered.',
  options:[
    { label:'Return the courtesy.', desc:'A suitable gift affirms both houses.',
      effects:{gold:-2, prestige:4} },
    { label:'Offer counsel instead.', desc:'A ruler’s experience can repay hospitality without coin.',
      effects:{skills:{dip:1,ste:1}} }
  ]}
);
