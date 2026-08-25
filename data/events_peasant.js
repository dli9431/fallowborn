/* =========================================================================
   Fallowborn — PEASANT, VILLAGE & LOWER-STATION EVENTS (tiers 0-2)
   ========================================================================= */
window.FBDATA = window.FBDATA || {};
FBDATA.events = FBDATA.events || [];

FBDATA.events.push(

/* ---------- the farming year ---------- */
{ id:'spring_sowing', title:'Sowing Season',
  trigger:{ tierMax:1, professions:['farmer'], seasons:[0], chance:0.5 }, weight:10, cooldown:3,
  text:'The thaw has come and the earth turns soft. What goes into the ground now decides who eats next winter.',
  options:[
    { label:'Sow the proven barley.', desc:'The sure loaf never made a song, but it fills the belly.', effects:{ setFlag:'crop_safe', log:'Sowed barley.' } },
    { label:'Gamble on wheat — richer, riskier.', desc:'A bold sowing could fill the granary — or empty it.', effects:{ setFlag:'crop_risky', log:'Gambled on wheat.' } },
    { label:'Sow little, hire out your back instead.', desc:'Coin today, and let another man fret at the sky.', effects:{ gold:3 } }
  ]},
{ id:'summer_storm', title:'Black Clouds Over the Fields',
  trigger:{ tierMax:1, professions:['farmer'], seasons:[1], chance:0.3 }, weight:8, cooldown:3,
  text:'Hail-heavy clouds pile up beyond the hills. A summer storm could flatten every stalk you own.',
  options:[
    { label:'Rush the early cutting.', desc:'Take what the field offers before the sky takes it back.', effects:{ gold:2, clearFlag:'crop_risky', setFlag:'crop_safe', health:-1 } },
    { label:'Trust to {god} and luck.', desc:'Prayer costs nothing; hail forgives nothing either.', chance:0.6,
      success:{ text:'The storm slides past. Your fields glitter, unharmed.', effects:{ } },
      failure:{ text:'Hail like slingstones. The crop is battered flat.', effects:{ clearFlag:'crop_safe', clearFlag2:'crop_risky', setFlag:'crop_ruined' } } }
  ]},
{ id:'harvest', title:'The Harvest',
  trigger:{ tierMax:1, professions:['farmer'], seasons:[2] }, weight:25, cooldown:3,
  text:'Scythes hiss in the fields from first light to last. The whole village works, prays, and counts.',
  options:[
    { label:'Bring it in.', desc:'Sweat now, and winter will tell you what it was worth.', chance:'harvest',
      success:{ text:'A fat harvest! Granaries groan, and there is a surplus to sell.', effects:{ gold:'harvest_good', prestige:2, clearHarvestFlags:true } },
      failure:{ text:'A thin, sad yield. Winter will have teeth this year.',
        effects:{ gold:1, setFlag:'lean_winter', clearHarvestFlags:true,
          marketShock:{ id:'lean_harvest', source:'lean_harvest',
            provinceId:'home', goodId:'provisions', production:-0.30,
            flow:-0.12, severe:true, seasons:8 } } } }
  ]},
{ id:'lean_winter', title:'The Hungry Months',
  trigger:{ tierMax:1, seasons:[3], flags:['lean_winter'] }, weight:25,
  text:'The grain jar echoes. Your household chews bark-bread and watches the snow.',
  options:[
    { label:'Buy grain at winter prices.', require:{ goldMin:6 }, desc:'Silver staves off hunger — at the season’s bitter price.', effects:{ gold:-6, clearFlag:'lean_winter' } },
    { label:'Tighten belts and endure.', desc:'The body pays what the purse is spared.', effects:{ health:-1, clearFlag:'lean_winter' } },
    { label:'Poach the lord’s deer.', desc:'Meat in the pot — if the forester looks away.', chance:0.6,
      success:{ text:'Venison in the pot, and none the wiser.', effects:{ clearFlag:'lean_winter', skills:{int:1} } },
      failure:{ text:'The forester catches you red-handed over the carcass.', effects:{ clearFlag:'lean_winter', queue:'caught_poaching' } } }
  ]},
{ id:'caught_poaching', title:'Caught!', trigger:{ never:true },
  text:'The forester marches you before {lord}. Poaching the lord’s game can cost a hand — or worse.',
  options:[
    { label:'Beg for mercy.', desc:'A bent knee may soften the sentence — or not.', chance:0.6,
      success:{ text:'The lord waves you off with a fine and a warning.', effects:{ gold:-5, opinion:{role:'lord', amt:-10}, rivalContact:{role:'lord', score:1, cause:'poaching'} } },
      failure:{ text:'The lord orders you flogged in the yard as a lesson.', effects:{ health:-2, prestige:-5, opinion:{role:'lord', amt:-10}, rivalContact:{role:'lord', score:1, cause:'poaching'} } } },
    { label:'Claim the deer was already dead.', desc:'A bold lie, and a thin one to hang your hand on.', chance:0.3,
      success:{ text:'Astonishingly, the lie holds.', effects:{ skills:{int:1} } },
      failure:{ text:'No one believes it. The flogging is worse for the insult.', effects:{ health:-2, prestige:-8, opinion:{role:'lord', amt:-15}, rivalContact:{role:'lord', score:2, cause:'poaching_lie'} } } }
  ]},

/* ---------- the lord's shadow (serfs) ---------- */
{ id:'corvee', title:'The Lord’s Due',
  trigger:{ tierMax:0, chance:0.35 }, weight:10, cooldown:4,
  text:'The reeve bangs on doors at dawn: {lord} requires labor — hauling stone, mending the mill-race, digging ditches.',
  options:[
    { label:'Work hard and be noticed.', desc:'Sweat spent where the powerful can see it.', effects:{ health:-1, opinion:{role:'lord', amt:8}, log:'Labored on the lord’s works.' } },
    { label:'Do the least you can.', desc:'Save your strength — if the reeve’s stick stays elsewhere.', chance:0.7,
      success:{ text:'You shirk artfully and save your strength.', effects:{ } },
      failure:{ text:'The reeve notices, and his stick argues the point.', effects:{ health:-1, opinion:{role:'lord', amt:-8} } } },
    { label:'Bribe the reeve to overlook you.', require:{ goldMin:3 }, desc:'A few coins, and the dawn knock is not for you.', effects:{ gold:-3 } }
  ]},
/* ---------- customary burdens (serfs) ---------- */
{ id:'serf_boon_harvest',
  title:{ forms:{ select:'value', param:'archetypeId', cases:{
    latin_manorial:'The Lord’s Harvest First',
    irrigated_fellah:'The Estate Harvest First',
    pagan_household_service:'The Master’s Harvest First',
    other:'The Customary Harvest First'
  }}},
  trigger:{ never:true },
  contextValidator:'serf_tenure_context_valid',
  text:{ forms:{ select:'value', param:'archetypeId', cases:{
    latin_manorial:'Your own grain stands ripe when the reeve’s horn sounds. Every able hand is summoned to reap {lord}’s demesne before a sickle may touch a household strip.',
    irrigated_fellah:'Your household fields are ready for harvest, but the overseer calls every laborer to the estate crop first. The shared ditches and storehouses must receive their {duty} before private sickles work.',
    pagan_household_service:'The grain in your household plot is ripe, but the master’s horn calls every hand to his great fields first. Custom commands that the master’s sheaves stand bound before your own are cut.',
    other:'Your own grain stands ripe when the horn sounds. Custom summons every able hand to harvest the estate fields before sickles may touch household ground.'
  }}},
  options:[
    { label:'Send every hand to the demesne.', desc:'The lord’s grain comes in while yours waits under the weather.',
      effects:{ health:-1, gold:-2, opinion:{role:'lord', amt:4} } },
    { label:'Hire someone to answer for you. ({money:4})', require:{ goldMin:4 }, desc:'Buy back the day your own harvest needs.',
      effects:{ gold:-4 } },
    { label:'Keep one reaper hidden at home.', desc:'One pair of hands for your field, if the tally misses them.', chance:'skill_int',
      success:{ text:'The count tallies heads, not shadows. Your hidden reaper saves the ripest rows.', effects:{ skills:{int:1} } },
      failure:{ text:'The missing hand is named before noon. The amercement costs more than the grain it saved.',
        effects:{ gold:-4, opinion:{role:'lord', amt:-8} } } }
  ]},
{ id:'serf_weekwork_tally',
  title:{ forms:{ select:'value', param:'archetypeId', cases:{
    latin_manorial:'A Longer Week',
    irrigated_fellah:'The Labor Tally',
    pagan_household_service:'The Service Roll',
    other:'A Longer Tally'
  }}},
  trigger:{ never:true },
  contextValidator:'serf_tenure_context_valid',
  text:{ forms:{ select:'value', param:'archetypeId', cases:{
    latin_manorial:'The steward measures every holding anew, then announces that your household owes one more day of week-work than the old tally showed.',
    irrigated_fellah:'The estate supervisor inspects the household plots and records an added measure of canal and field labor for {duty} beyond the customary tally.',
    pagan_household_service:'The master’s bailiff inspects the household dwellings and marks another day of heavy service onto the wooden tally stick.',
    other:'The steward measures every holding anew, then announces that your household owes an added day of customary labor beyond the old tally.'
  }}},
  options:[
    { label:'Give the added day.', desc:'A day for the lord is a day stolen from your own ground.',
      effects:{ health:-1, opinion:{role:'lord', amt:3} } },
    { label:'Commute it into coin. ({money:3})', require:{ goldMin:3 }, desc:'Silver works even when your back does not.',
      effects:{ gold:-3 } },
    { label:'Call neighbors who remember the old tally.', desc:'Custom lives in witnesses, but stewards keep the ink.', chance:'skill_lea',
      success:{ text:'Three elders repeat the same number. The steward restores the missing stroke.', effects:{ prestige:3, skills:{lea:1} } },
      failure:{ text:'Memory bends under questions. The new tally stands, with a penalty for delay.', effects:{ health:-1, prestige:-3 } } }
  ]},
{ id:'serf_mill_multure',
  title:{ forms:{ select:'value', param:'archetypeId', cases:{
    latin_manorial:'The Miller’s Share',
    irrigated_fellah:'The Mill Multure',
    pagan_household_service:'The Grinding Toll',
    other:'The Mill Toll'
  }}},
  trigger:{ never:true },
  contextValidator:'serf_tenure_context_valid',
  text:{ forms:{ select:'value', param:'archetypeId', cases:{
    latin_manorial:'The miller finds meal from a hand-quern in your bin. Grain from this holding must pass beneath {lord}’s millstones, with every lawful sack leaving a share behind.',
    irrigated_fellah:'The estate miller discovers flour ground by hand in your dwelling. By local custom, grain harvested from dependent soil must be ground at the communal watermill and render its customary {duty}.',
    pagan_household_service:'The master’s miller notices stone-ground meal in your grain chest. Custom forbids household querns while the master’s mill wheel turns, demanding a share of every sack.',
    other:'The miller finds meal from a private quern in your bin. Grain from this holding must pass beneath the estate millstones, leaving its customary toll behind.'
  }}},
  options:[
    { label:'Surrender the miller’s share.', desc:'Lose the grain and close the matter.', effects:{ gold:-3 } },
    { label:'Carry the rest back to the lord’s mill.', desc:'Pay the toll in grain, road, and aching shoulders.', effects:{ gold:-1, health:-1 } },
    { label:'Swear the meal came from another manor.', desc:'A boundary may hide what a quern cannot.', chance:'skill_int',
      success:{ text:'The miller cannot prove whose stones ground it and lets the sack go.', effects:{ skills:{int:1} } },
      failure:{ text:'The flour is still warm from your quern. He seizes the sack and adds a fine.',
        effects:{ gold:-5, opinion:{role:'lord', amt:-6} } } }
  ]},
{ id:'serf_pannage_due',
  title:{ forms:{ select:'value', param:'archetypeId', cases:{
    latin_manorial:'Under the Oak Mast',
    pagan_household_service:'Woodland Pasture Due',
    other:'Pannage in the Woods'
  }}},
  trigger:{ never:true },
  contextValidator:'serf_tenure_context_valid',
  text:{ forms:{ select:'value', param:'archetypeId', cases:{
    latin_manorial:'Acorns lie thick beneath the lord’s oaks, enough to fatten every village pig. The forester waits at the wood’s edge to collect pannage before a snout crosses the ditch.',
    pagan_household_service:'Fallen acorns and beech mast cover the master’s sacred woods. The woodsman demands the customary tribute before your swine may fatten under the trees.',
    other:'Acorns lie thick beneath the estate oaks. The forester waits at the wood’s edge to collect the customary {duty} before swine may forage.'
  }}},
  options:[
    { label:'Pay for the woodland mast.', desc:'A lean purse now for a fatter animal in winter.', effects:{ gold:-2 } },
    { label:'Keep the swine penned and feed them grain.', desc:'Save the fee and spend the household’s own food instead.', effects:{ gold:-2 } },
    { label:'Drive them in after moonrise.', desc:'The pigs know no law; the forester does.', chance:'skill_int',
      success:{ text:'By dawn the herd is round-bellied and back behind its wattle fence.', effects:{ skills:{int:1} } },
      failure:{ text:'A bellwether squeals beneath the forester’s window. He takes the fattest pig as amercement.',
        effects:{ gold:-5, opinion:{role:'lord', amt:-8} } } }
  ]},
{ id:'serf_marriage_leave',
  title:{ forms:{ select:'value', param:'archetypeId', cases:{
    latin_manorial:'Leave to Wed',
    irrigated_fellah:'The Marriage Custom',
    pagan_household_service:'Master’s Leave to Wed',
    other:'Customary Marriage Dues'
  }}},
  trigger:{ never:true },
  contextValidator:'serf_tenure_context_valid',
  text:{ forms:{ select:'value', param:'archetypeId', cases:{
    latin_manorial:'The reeve comes after the wedding feast with a reminder: an unfree tenant does not marry beyond the household without {lord}’s leave, and leave has its price.',
    irrigated_fellah:'Following the marriage, the village elder arrives to record the new union in the estate rolls and collect the customary {duty}.',
    pagan_household_service:'Following your vows, the master’s officer appears at the hearth: an unfree servant does not take a spouse without the master’s sanction and service payment.',
    other:'The steward comes after the wedding with a reminder: a dependent tenant owes customary leave and dues to the lord upon forming a new household.'
  }}},
  options:[
    { label:'Pay the marriage fine. ({money:5})', require:{ goldMin:5 }, desc:'Begin married life with an emptier purse and a closed tally.', effects:{ gold:-5 } },
    { label:'Work the fine in extra days.', desc:'Let your back purchase what the wedding promised.',
      effects:{ health:-1, opinion:{role:'lord', amt:2} } },
    { label:'Petition for a smaller payment.', desc:'Ask the lord to value a settled household over ready silver.', chance:'skill_dip',
      success:{ text:'The steward cuts the fine to two coins and calls it favor.', effects:{ gold:-2, skills:{dip:1} } },
      failure:{ text:'The petition is called ingratitude. The full fine grows by another coin.',
        effects:{ gold:-6, opinion:{role:'lord', amt:-5} } } }
  ]},
{ id:'serf_tithe_sheaf',
  title:{ forms:{ select:'value', param:'archetypeId', cases:{
    latin_manorial:'The Tenth Sheaf',
    irrigated_fellah:'The Harvest Tithe',
    pagan_household_service:'Sacred First Fruits',
    other:'The Tithe Sheaf'
  }}},
  trigger:{ never:true },
  contextValidator:'serf_tenure_context_valid',
  text:{ forms:{ select:'value', param:'archetypeId', cases:{
    latin_manorial:'The tithe collector walks the stubble counting every tenth sheaf for the {temple}. The lord’s harvest is already gone, and winter has not yet shown its teeth.',
    irrigated_fellah:'The collector of religious dues walks the threshing floor to measure the customary share of grain for {duty} and charitable endowments.',
    pagan_household_service:'The elder priest arrives at the field’s edge to take the sacred tenth of the harvest for the altar and seasonal rites.',
    other:'The tithe collector walks the field counting every tenth sheaf for the {temple}. The customary share must be delivered before winter arrives.'
  }}},
  options:[
    { label:'Give the full tenth.', desc:'Render the sacred share and tighten the household store.', effects:{ gold:-2, piety:2 } },
    { label:'Cart the parish grain in place of part of it.', desc:'Pay with shoulders where the granary cannot.', effects:{ health:-1, piety:3 } },
    { label:'Bury two sheaves beneath the straw.', desc:'Hide grain from the collector and the sin from yourself.', chance:'skill_int',
      success:{ text:'The count ends two sheaves short, and no hand finds them.', effects:{ piety:-2, skills:{int:1} } },
      failure:{ text:'A fork strikes the hidden bundle. The grain goes to the church with an amercement besides.',
        effects:{ gold:-5, piety:-4 } } }
  ]},
{ id:'serf_bridge_cartage',
  title:{ forms:{ select:'value', param:'archetypeId', cases:{
    latin_manorial:'Timber for the Bridge',
    irrigated_fellah:'Waterworks Cartage',
    pagan_household_service:'Hauling for the Fort',
    other:'Communal Cartage Due'
  }}},
  trigger:{ never:true },
  contextValidator:'serf_tenure_context_valid',
  text:{ forms:{ select:'value', param:'archetypeId', cases:{
    latin_manorial:'Floodwater has bitten through the bridge piles. The steward apportions timber, carts, and labor by holding; your mark appears beside the longest haul.',
    irrigated_fellah:'Seasonal floods have damaged the irrigation dikes and stone bridges. The water bailiff assigns cartage and heavy labor for {duty} to every holding; your household receives the longest run.',
    pagan_household_service:'Heavy spring rains have washed out the ford and palisade ditch. The master demands logs, stone, and carts from every serf dwelling to restore the works.',
    other:'Seasonal floods have damaged the local roadways and bridges. The steward apportions timber and carts by holding; your mark appears beside the longest haul.'
  }}},
  options:[
    { label:'Take the cart road and haul it.', desc:'A sound bridge for everyone, paid for by your bones.', effects:{ health:-1 } },
    { label:'Lend the household cart and stay afield.', desc:'Let wheel and axle suffer in your place.', effects:{ gold:-2 } },
    { label:'Find a shorter way through the shallows.', desc:'Save half the road if your eye for ground is true.', chance:'skill_ste',
      success:{ text:'The ford holds, the timber arrives early, and others follow your track.', effects:{ skills:{ste:1}, prestige:2 } },
      failure:{ text:'A wheel sinks to the hub. Dragging it free costs the strength you meant to save.', effects:{ health:-2 } } },
    { label:'Pay a carter to take your mark. ({money:3})', require:{ goldMin:3 }, desc:'Another household takes the mud; yours pays the coin.', effects:{ gold:-3 } }
  ]},
{ id:'serf_common_oven',
  title:{ forms:{ select:'value', param:'archetypeId', cases:{
    latin_manorial:'The Lord’s Oven',
    irrigated_fellah:'The Communal Bakery',
    pagan_household_service:'The Master’s Hearth',
    other:'The Common Oven'
  }}},
  trigger:{ never:true },
  contextValidator:'serf_tenure_context_valid',
  text:{ forms:{ select:'value', param:'archetypeId', cases:{
    latin_manorial:'The village oven is hot, and the baker has raised the customary toll. He points to the cold clay ovens behind the cottages: none may bake while {lord}’s fire burns.',
    irrigated_fellah:'The village bakery is fired for the winter bread, but the baker raises the customary toll on household dough under {duty}. Private hearth ovens remain locked under village regulation.',
    pagan_household_service:'The master’s communal oven is heated, and his servant collects a heavy toll of dough from every cottage. Domestic baking without permission is forbidden.',
    other:'The village oven is fired, and the baker demands the customary toll. Private baking is restricted while the communal oven burns.'
  }}},
  options:[
    { label:'Pay the oven toll.', desc:'Lawful bread, dearer than yesterday’s.', effects:{ gold:-2 } },
    { label:'Bring fuel and tend the fire instead.', desc:'Trade a day in the coppice for the baker’s share.', effects:{ health:-1 } },
    { label:'Bake beneath a covered pot after dark.', desc:'A small loaf leaves a long trail of smoke.', chance:'skill_int',
      success:{ text:'The coals cool before dawn, leaving bread and no witness.', effects:{ skills:{int:1} } },
      failure:{ text:'Smoke curls above the roof. The baker arrives before the loaf is cool.',
        effects:{ gold:-4, opinion:{role:'lord', amt:-5} } } }
  ]},
{ id:'serf_deadwood_amerced',
  title:{ forms:{ select:'value', param:'archetypeId', cases:{
    latin_manorial:'Whose Fallen Wood?',
    pagan_household_service:'Fuel from the Master’s Wood',
    other:'Deadwood Gathering Due'
  }}},
  trigger:{ never:true },
  contextValidator:'serf_tenure_context_valid',
  text:{ forms:{ select:'value', param:'archetypeId', cases:{
    latin_manorial:'The forester stops your sledge at the wood’s edge. You gathered only storm-fallen limbs, but he says even dead wood belongs first to {lord}.',
    pagan_household_service:'The woodsman blocks your way as you pull dry branches from the master’s forest. He declares that even dead timber and frost-cracked wood belong to the master’s store.',
    other:'The forester stops your cart at the wood’s edge. You gathered only storm-fallen limbs, but he insists that all deadwood belongs first to the estate under {duty}.'
  }}},
  options:[
    { label:'Pay the wood amercement. ({money:3})', require:{ goldMin:3 }, desc:'Keep the fuel and surrender the coin.', effects:{ gold:-3 } },
    { label:'Leave the whole bundle.', desc:'Walk home cold rather than enter the forester’s book.', effects:{ health:-1 } },
    { label:'Name the old right to fallen branches.', desc:'Custom may shelter the poor, if anyone admits remembering it.', chance:'skill_lea',
      success:{ text:'An elder confirms the right before the forester can close the question.', effects:{ prestige:2, skills:{lea:1} } },
      failure:{ text:'The forester calls custom a tale told by thieves. The fine doubles.',
        effects:{ gold:-4, opinion:{role:'lord', amt:-5} } } }
  ]},
{ id:'serf_officers_quartered',
  title:{ forms:{ select:'value', param:'archetypeId', cases:{
    latin_manorial:'Boots by the Hearth',
    irrigated_fellah:'Quartering the Retainers',
    pagan_household_service:'Warriors at the Door',
    other:'Billeting and Quartering'
  }}},
  wartime:true,
  trigger:{ never:true },
  contextValidator:'serf_tenure_context_valid',
  text:{ forms:{ select:'value', param:'archetypeId', cases:{
    latin_manorial:'Mounted officers in {lord}’s colors claim your fire, fodder, supper, and bedding for the night. By custom they pay; by morning they may remember the custom differently.',
    irrigated_fellah:'Armed riders from the garrison arrive at dusk demanding shelter, barley for their horses, and food from the household store while the realm is at war under {duty}.',
    pagan_household_service:'The master’s warband returns from the borders and billets in the serf dwellings. They take the hearth, grain, and straw by right of martial service.',
    other:'Armed retainers in the lord’s colors demand hearth, fodder, and food for the night under the customary wartime billeting obligation.'
  }}},
  options:[
    { label:'Set out everything they ask.', desc:'An empty larder may purchase a favorable word.',
      effects:{ gold:-4, opinion:{role:'lord', amt:4} } },
    { label:'Give them the hearth and sleep in the byre.', desc:'Spare some food by yielding every comfort.', effects:{ gold:-2, health:-1 } },
    { label:'Hide the best stores before they dismount.', desc:'A bare shelf can lie more smoothly than its owner.', chance:'skill_int',
      success:{ text:'They eat coarse bread, complain, and never find the smoked meat overhead.', effects:{ skills:{int:1} } },
      failure:{ text:'A trooper finds the false panel. They take the hidden food as well as the supper.',
        effects:{ gold:-6, health:-1 } } },
    { label:'Send them toward a richer roof.', desc:'Move the burden to a neighbor and live with the village’s memory.',
      effects:{ prestige:-3, popularOpinion:-2 } }
  ]},

/* ---------- extraordinary burdens: every road costs something ---------- */
{ id:'serf_extraordinary_tallage', title:'Tallage Without Measure', once:true,
  trigger:{ tierMax:0, minAge:16, goldMin:4, chance:0.035 }, weight:2, cooldown:32,
  text:'A sealed tally arrives without harvest, feast, or judgment to explain it. {lord} needs silver, the steward says, and an unfree household owes what its lord chooses to ask.',
  options:[
    { label:'Empty the purse into the tally chest.', desc:'Keep your body and your silence; lose the household reserve.',
      effects:{ gold:-10 } },
    { label:'Offer a month of added labor.', desc:'Pay the arbitrary demand in winter strength.',
      effects:{ health:-2, prestige:-2 } },
    { label:'Refuse before the manor court.', desc:'Keep coin and strength; let defiance become the next debt.',
      effects:{ prestige:-8, opinion:{role:'lord', amt:-15} } }
  ]},
{ id:'serf_seed_grain_requisition', title:'The Granary Is Opened', once:true, wartime:true,
  trigger:{ tierMax:0, minAge:16, realmAtWar:true, seasons:[2,3], chance:0.05 },
  weight:2, cooldown:24,
  text:'The war has eaten the lord’s stores. Armed men break the seal on your granary and name its seed corn provisions for the host; what they leave will not sow every strip.',
  options:[
    { label:'Yield the seed grain.', desc:'Feed the host now and meet winter with a hollow bin.',
      effects:{ gold:-8, health:-1, setFlag:'lean_winter' } },
    { label:'Surrender cart and draft gear instead.', desc:'Keep seed enough to sow by giving up the means to haul it.',
      effects:{ gold:-10, prestige:-2 } },
    { label:'Stand in the granary door.', desc:'Make them move you before they move the sacks.',
      effects:{ health:-2, prestige:-5, opinion:{role:'lord', amt:-15} } }
  ]},

{ id:'tax_collector', title:'The Taxman Cometh',
  trigger:{ tierMax:1, seasons:[2], chance:0.4 }, weight:12, cooldown:3,
  text:'The lord’s man arrives with his ledger and his soldiers, tallying hearths and hens alike.',
  options:[
    { label:'Pay what is owed.', require:{ goldMin:3 }, desc:'The ledger closes, and the soldiers move on.', effects:{ gold:-3, opinion:{role:'lord', amt:3} } },
    { label:'Hide the second goat.', desc:'One goat bleats twice as loud when coin is at stake.', chance:0.65,
      success:{ text:'The ledger records one thin goat. The fat one chews safely in the wood.', effects:{ gold:-1, skills:{int:1} } },
      failure:{ text:'Bleating betrays you. The fine stings worse than the tax.', effects:{ gold:-6, opinion:{role:'lord', amt:-10} } } },
    { label:'Plead poverty.', desc:'Empty hands may move him — or merely invite his.', chance:0.4,
      success:{ text:'The collector sighs and moves on.', effects:{ } },
      failure:{ text:'He takes your goods in lieu of coin.', effects:{ gold:-4 } } }
  ]},
{ id:'lord_squeezes', title:'A Tally With Your Name On It',
  trigger:{ tierMax:2, roleOpinionBelow:{role:'lord', value:-40}, chance:0.25 }, weight:7, cooldown:8,
  text:'The reeve arrives with a new tally, and your name sits at the top of it — extra boon-days, and a “customary” gift no one else is asked to pay. {lord}’s dislike has found its way into the ledger.',
  options:[
    { label:'Pay without a word. ({money:4})', require:{ goldMin:4 }, desc:'Coin today, and the tally-man moves on.', effects:{ gold:-4 } },
    { label:'Work the extra days instead.', desc:'The back pays what the purse is spared.', effects:{ health:-1 } },
    { label:'Appeal to the old custom.', desc:'Right may be on your side — the ledger is on his.', chance:0.4,
      success:{ text:'You name the custom and the witnesses to it. The reeve scratches out the line, scowling.', effects:{ prestige:3, skills:{lea:1} } },
      failure:{ text:'“Custom is what the lord says it is.” The tally stands — and there is a fine for arguing.', effects:{ gold:-4, health:-1, opinion:{role:'lord', amt:-5} } } }
  ]},
{ id:'lords_notice', title:'The Lord’s Eye',
  trigger:{ tierMax:0, roleOpinionAbove:{role:'lord', value:25}, chance:0.4 }, weight:10, once:true,
  text:'{lord} reins in beside your strip of field. “You. You’re the one who works like two men. What is it you want in this life?”',
  options:[
    { label:'“My freedom, lord, if I earn it.”', desc:'Receive one exact favorable offer; it still must be afforded and accepted.', effects:{ opinion:{role:'lord', amt:5}, custom:'freedom_lords_notice' } },
    { label:'“Only to serve, lord.”', desc:'Humility pleases the powerful, and asks for nothing.', effects:{ opinion:{role:'lord', amt:10} } },
    { label:'“Land of my own, someday.”', desc:'An honest ambition, honestly confessed.', effects:{ opinion:{role:'lord', amt:3} } }
  ]},
{ id:'manumission', title:'A Man of Your Own',
  trigger:{ never:true }, weight:20,
  contextValidator:'freedom_offer_context_valid',
  text:'The {holy} drafts the exact terms by candlelight. {lord} asks {money:price}; the record names {serviceDays} days of final service.',
  options:[
    { label:'Accept these exact terms.', require:{ custom:'freedom_offer_accept_ready' }, desc:'Pay the saved price once; any written final service must then be completed.', effects:{ custom:'freedom_accept_offer' } },
    { label:'Not yet.', desc:'The saved offer remains unchanged until its exact expiry.', effects:{ } }
  ]},

/* ---------- village life ---------- */
{ id:'village_festival', title:'Festival Day',
  trigger:{ tierMax:2, seasons:[1], chance:0.35 }, weight:8, cooldown:4,
  text:'Garlands on the well, a lamb on the spit, and the musicians already flushed with cheer. {province} forgets its burdens for a day.',
  options:[
    { label:'Dance, eat, laugh.', desc:'A day of joy costs little and pays in strength.', effects:{ health:1, opinion:{role:'friend', amt:5} } },
    { label:'Enter the wrestling.', desc:'Glory or dirt, before the whole village.', chance:0.5,
      success:{ text:'You pin the miller’s enormous son to roars of delight.', effects:{ prestige:5, skills:{mar:1} } },
      failure:{ text:'You eat dirt in front of the whole village. They cheer anyway.', effects:{ health:-1, prestige:-1 } } },
    { label:'Sell ale to the merrymakers.', require:{ goldMin:2, religionGroups:['christian','pagan','jewish'] }, desc:'Merry throats make heavy purses.', effects:{ gold:4, skills:{ste:1} } },
    { label:'Sell sweets and sherbet to the crowd.', require:{ goldMin:2, religionGroups:['muslim'] }, desc:'Sweet water for sweet coin.', effects:{ gold:4, skills:{ste:1} } }
  ]},
{ id:'wolves', title:'Wolves at the Fold',
  trigger:{ tierMax:1, seasons:[3], terrains:['forest','hills','mountains'], chance:0.25 }, weight:8, cooldown:8,
  text:'Tracks in the snow, big as your palm. Something has been at the sheep, and the dogs whine at dusk.',
  options:[
    { label:'Hunt the beast.', desc:'A pelt and a name — or a scar to carry home.', chance:0.55,
      success:{ text:{ default:'You come home dragging a grey carcass. The village drinks your health.',
        muslim:'You come home dragging a grey carcass. The village feasts you as a hero.' }, effects:{ prestige:6, gold:2, skills:{mar:1} } },
      failure:{ text:'The wolf leaves you a scar to remember it by.', effects:{ health:-2, addTrait:'scarred' } } },
    { label:'Pen the flock and wait for spring.', desc:'The wolf eats what patience costs.', effects:{ gold:-2 } }
  ]},
{ id:'boundary_dispute', title:'The Moved Stone',
  trigger:{ tierMin:1, tierMax:1, professions:['farmer'], chance:0.15 }, weight:6, cooldown:12,
  text:'Your neighbor’s plough has crept over the boundary stone — or did the stone itself walk? A strip of your land is suddenly his.',
  options:[
    { label:'Bring it before the village moot.', desc:'Trust the elders to see straight — if kinship allows.', chance:0.6,
      success:{ text:'The elders find for you. The stone walks home.', effects:{ prestige:4 } },
      failure:{ text:'His cousin sits on the moot. The stone stays.', effects:{ prestige:-3 } } },
    { label:'Move it back by night.', desc:'Stones are quietest movers after dark.', chance:0.7,
      success:{ text:'The stone returns as mysteriously as it left.', effects:{ skills:{int:1} } },
      failure:{ text:'Caught in the moonlight, shovel in hand. The moot fines you.', effects:{ gold:-4, prestige:-4 } } },
    { label:'Let it go.', desc:'A strip of land is cheaper than a feud.', effects:{ piety:2, prestige:-1 } }
  ]},
{ id:'foundling', title:'The Basket at the Door',
  trigger:{ tierMax:1, chance:0.06, married:true }, weight:3, once:true,
  text:'A baby, swaddled in rags, left at your doorstep in the night. It looks up at you and does not cry.',
  options:[
    { label:'Raise it as your own.', desc:'One more mouth, one more soul at your hearth.', effects:{ adoptChild:true, piety:10, gold:-2, log:'Took in a foundling.' } },
    { label:'Carry it to the {temple}.', desc:'Let the house of {god} answer for the child.', effects:{ piety:3, opinion:{role:'priest', amt:5} } }
  ]},
{ id:'market_day_find', title:'A Bargain at Market',
  trigger:{ tierMax:1, chance:0.15, goldMin:4 }, weight:5, cooldown:8,
  text:'A trader down on his luck offers a sturdy ox for a quarter its worth. His eyes dart as he talks.',
  options:[
    { label:'Buy it. ({money:4})', desc:'Cheap beasts sometimes come with expensive histories.', chance:0.7,
      success:{ text:'A fine beast, honestly come by or not. Your ploughing doubles.', effects:{ gold:-4, setFlag:'own_ox' } },
      failure:{ text:'A week later its owner arrives with the reeve. The ox goes home; your coin does not.', effects:{ gold:-4, prestige:-3 } } },
    { label:'Too good to be honest.', desc:'Walk away from luck that glances over its shoulder.', effects:{ } }
  ]},
{ id:'bandits_village', title:'Riders on the Road',
  trigger:{ tierMax:1, chance:0.12, notFlags:['on_campaign'] }, weight:6, cooldown:10,
  text:'Masterless men have made camp in the wood — deserters and debtors with knives. Now a shepherd lies dead, and folk bar their doors.',
  options:[
    { label:'Rouse the village to drive them out.', desc:'Pitchforks against knives — courage against hard men.', chance:0.55,
      success:{ text:'Pitchforks and fury. The bandits scatter, leaving loot behind.', effects:{ gold:5, prestige:8, skills:{mar:1}, log:'Drove bandits from {province}.' } },
      failure:{ text:'They are harder men than farmers. You carry home a wound.', effects:{ health:-2, prestige:2 } } },
    { label:'Send to {lord} for soldiers.', desc:'The lord’s protection, at a small reminder of its price.', effects:{ opinion:{role:'lord', amt:3}, gold:-1 } },
    { label:'Pay them to move on.', require:{ goldMin:5 }, desc:'Buy quiet, and hope quiet stays bought.', effects:{ gold:-5 } }
  ]},
{ id:'good_ox_year', title:'A Strong Team',
  trigger:{ tierMax:1, flags:['own_ox'], seasons:[2], chance:0.5 }, weight:6, cooldown:3,
  text:'With the ox pulling, you plough deeper and faster than any neighbor. The extra furlongs pay.',
  options:[ { label:'The beast earns its hay.', desc:'Let the plough do the boasting.', effects:{ gold:4 } } ]},

{ id:'lord_covets_horse', title:'A Lord’s Long Look',
  trigger:{ holdings:['warhorse'], tierMax:1, chance:0.12 }, weight:4, cooldown:16,
  text:'{lord} reins in beside your warhorse and looks it over far too long. “A fine beast,” he says, “for a common man.”',
  options:[
    { label:'Offer it as a gift.', desc:'Generosity the powerful remember.', effects:{ loseHolding:'warhorse', opinion:{role:'lord', amt:25}, prestige:5 } },
    { label:'“Bred and paid for, lord.”', desc:'Stand your ground and pray he admires it.', chance:0.7,
      success:{ text:'He grunts, half insulted and half impressed, and rides on.', effects:{ prestige:3 } },
      failure:{ text:'Days later the horse is “requisitioned for the levy.” You are paid a tenth of its worth.',
        effects:{ loseHolding:'warhorse', gold:3, opinion:{role:'lord', amt:-5} } } }
  ]},

/* ---------- serf flight ---------- */
{ id:'flee_serfdom', title:'The Open Road',
  trigger:{ tierMax:0, chance:0.08, roleOpinionBelow:{role:'lord', value:-20} }, weight:6, cooldown:12,
  text:'They say a serf who reaches a town and lives there a year and a day is free. The road is long, the law is against you — but the door stands open tonight.',
  options:[
    { label:'Run.', desc:'Freedom at the end of the road — or a halter.', chance:0.5,
      success:{ text:'Weeks of hedgerows and hunger — but you make it. A new province, a new name, a free life.', effects:{ serfFreedom:{route:'flight'}, moveRandom:true, gold:-3, prestige:5 } },
      failure:{ text:'The lord’s riders catch you at the ford. You are dragged back in a halter.', effects:{ health:-2, prestige:-10, opinion:{role:'lord', amt:-20}, rivalContact:{role:'lord', score:2, cause:'attempted_escape'} } } },
    { label:'Stay. This is home, chains and all.', desc:'Better the known yoke than the unknown road.', effects:{ } }
  ]},

/* ================= THE OLD CUSTOM — five-part landmark chain ================= */
{ id:'old_custom_stakes', title:'Stakes in the Common',
  trigger:{ tierMax:2, minAge:16, chance:0.2 }, weight:15, once:true,
  text:'Fresh stakes stand across the waste where the households of {province} have grazed beasts, cut fuel, and drawn water since anyone remembers. The reeve says it is the lord’s land, and tomorrow it will be closed.',
  options:[
    { label:'Call every household together.', desc:'One voice carries further than forty quarrels.', chance:'skill_dip', effects:{ setFlag:'old_custom_1' },
      success:{ text:'Quarrels are put aside. One by one, the households agree to speak with a single voice.', effects:{ setFlag:'rights_evidence', prestige:2, popularOpinion:3, skills:{dip:1} } },
      failure:{ text:'Old grudges prove stronger than old custom. Half the village will not stand beside the other half.', effects:{ popularOpinion:-2 } } },
    { label:'Measure exactly what is being taken.', desc:'Grief argued in numbers is harder to dismiss.', chance:'skill_ste', effects:{ setFlag:'old_custom_1' },
      success:{ text:'Paces, rents, beasts, winter fuel — you put a number to every loss.', effects:{ setFlag:'rights_evidence', prestige:2, skills:{ste:1} } },
      failure:{ text:'The strips, ditches, and remembered bounds refuse to add up cleanly.', effects:{ } } },
    { label:'Find words older than the reeve.', desc:'Somewhere, ink remembers what men deny.', chance:'skill_lea', effects:{ setFlag:'old_custom_1' },
      success:{ text:'A neglected record speaks of pasture and fuel owed to every hearth.', effects:{ setFlag:'rights_evidence', prestige:2, skills:{lea:1} } },
      failure:{ text:'Dust, worm-holes, and pious accounts — but no grant anyone can use.', effects:{ } } },
    { label:'Tell the reeve who is stirring trouble.', desc:'Sell your neighbors’ names and see what coin buys.', chance:'skill_int', effects:{ setFlag:'old_custom_1', setFlag2:'rights_collaborator', popularOpinion:-4 },
      success:{ text:'The reeve pays for names and promises to remember yours kindly.', effects:{ gold:3, opinion:{role:'lord', amt:5}, skills:{int:1} } },
      failure:{ text:'He takes the names, keeps his coin, and looks at you with contempt.', effects:{ opinion:{role:'lord', amt:-5}, prestige:-2 } } }
  ]},

{ id:'old_custom_memory', title:'What the Old Folk Remember',
  trigger:{ flags:['old_custom_1'] }, weight:50, once:true,
  text:'Every elder remembers the boundary, but none remembers it quite alike. If custom is to stand before judgment, memory must become proof.',
  options:[
    { label:'Take sworn testimony from every hearth.', desc:'Oaths in chorus are heavy to lift against.', chance:'skill_dip', effects:{ clearFlag:'old_custom_1', setFlag:'old_custom_2' },
      success:{ text:'The stories agree where it matters. A village speaking together is difficult to dismiss.', effects:{ setFlag:'rights_evidence', prestige:3, skills:{dip:1} } },
      failure:{ text:'Two witnesses fall to shouting over whose grandfather owned which sow.', effects:{ popularOpinion:-2 } } },
    { label:'Search the old records again.', desc:'Dust may yet yield what memory cannot.', chance:'skill_lea', effects:{ clearFlag:'old_custom_1', setFlag:'old_custom_2' },
      success:{ text:'In a faded hand: pasture, fallen wood, and water, reserved to the households in perpetuity.', effects:{ setFlag:'rights_evidence', prestige:3, skills:{lea:1} } },
      failure:{ text:'The page that might have settled it was scraped clean generations ago.', effects:{ } } },
    { label:'Walk the old boundary by night.', desc:'The land keeps its own record, if you can read it.', chance:'skill_ste', effects:{ clearFlag:'old_custom_1', setFlag:'old_custom_2' },
      success:{ text:'Notches on trees and stones beneath the moss agree with the oldest memories.', effects:{ setFlag:'rights_evidence', skills:{ste:1} } },
      failure:{ text:'The forester finds you beyond the new stakes and reports the trespass.', effects:{ opinion:{role:'lord', amt:-6}, prestige:-2 } } },
    { label:'Pay a clerk for a clean copy. ({money:8})', require:{ goldMin:8 }, desc:'Coin turns hearsay into parchment.',
      effects:{ gold:-8, clearFlag:'old_custom_1', setFlag:'old_custom_2', setFlag2:'rights_evidence' } },
    { label:'Write the missing custom yourself.', desc:'A forged past is a dangerous foundation.', chance:'skill_int', effects:{ clearFlag:'old_custom_1', setFlag:'old_custom_2' },
      success:{ text:'Old ink, old phrasing, an old seal impressed again. It may be enough.', effects:{ setFlag:'rights_evidence', skills:{int:1}, piety:-2 } },
      failure:{ text:'The clerk recognizes his predecessor’s hand — and knows this is not it.', effects:{ prestige:-5, opinion:{role:'lord', amt:-10}, piety:-3 } } }
  ]},

{ id:'old_custom_reeve', title:'The Reeve Comes at Dusk',
  trigger:{ flags:['old_custom_2'] }, weight:50, once:true,
  text:'The reeve comes without his men. First he offers a purse. Then he explains, very softly, what refusal may cost.',
  options:[
    { label:'Reject his purse before witnesses.', desc:'Refusal heard by many is hard to punish quietly.',
      effects:{ clearFlag:'old_custom_2', setFlag:'old_custom_3', prestige:5, popularOpinion:5, opinion:{role:'lord', amt:-5} } },
    { label:'Take the purse and give him names.', desc:'Silver now; the village’s memory later.',
      effects:{ clearFlag:'old_custom_2', setFlag:'old_custom_3', setFlag2:'rights_collaborator', gold:12, popularOpinion:-12, opinion:{role:'lord', amt:10} } },
    { label:'Make him reveal whose purse it truly is.', desc:'Trap him into speaking his master’s secrets.', chance:'skill_int', effects:{ clearFlag:'old_custom_2', setFlag:'old_custom_3' },
      success:{ text:'A feigned misunderstanding draws out the second tally — the one the lord has never seen.', effects:{ setFlag:'rights_evidence', prestige:5, skills:{int:1} } },
      failure:{ text:'He recognizes the trap and leaves smiling. The next threat will not be private.', effects:{ opinion:{role:'lord', amt:-6} } } },
    { label:'Make him use the stick in public.', desc:'Bruises seen by all accuse louder than words.', chance:'battle', effects:{ clearFlag:'old_custom_2', setFlag:'old_custom_3' },
      success:{ text:'You do not give ground. By morning every bruise in the village belongs to your cause.', effects:{ setFlag:'rights_evidence', prestige:8, popularOpinion:5, skills:{mar:1} } },
      failure:{ text:'His men put you down hard, but they must do it where everyone can see.', effects:{ health:-2, prestige:3, popularOpinion:3 } } },
    { label:'Ask {lord} to examine his own reeve.', require:{ roleOpinionAbove:{role:'lord', value:20} }, desc:'Appeal over the dog to the hand that feeds it.',
      effects:{ clearFlag:'old_custom_2', setFlag:'old_custom_3', setFlag2:'rights_evidence', opinion:{role:'lord', amt:-3} } },
    { label:'Ask {priest} to stand as protector. (5 piety)', require:{ pietyMin:40 }, desc:'Call in the favor heaven owes you.',
      effects:{ piety:-5, clearFlag:'old_custom_2', setFlag:'old_custom_3', setFlag2:'rights_evidence', opinion:{role:'priest', amt:10} } }
  ]},

{ id:'old_custom_hearing', title:'Before the Lord’s Bench',
  trigger:{ flags:['old_custom_3'] }, weight:60, once:true,
  text:'The households crowd the hall. The reeve has his tally and his men; you have whatever truth, skill, and favor you managed to gather.',
  options:[
    { label:'“Custom lives in those who keep it.”', desc:'Win the hall with voices, or lose it to silence.', chance:'rights_dip', effects:{ clearFlag:'old_custom_3' },
      success:{ text:'One witness follows another until even the steward must call the custom proven.', effects:{ setFlag:'old_custom_resolve', setFlag2:'old_custom_won', prestige:6, skills:{dip:1} } },
      failure:{ text:'The steward calls it noise, not law. The reeve’s smile returns.', effects:{ setFlag:'old_custom_resolve', setFlag2:'old_custom_lost', prestige:-4 } } },
    { label:'Lay out the rents, measures, and losses.', desc:'Let his own arithmetic betray him.', chance:'rights_ste', effects:{ clearFlag:'old_custom_3' },
      success:{ text:'The reeve’s demand contradicts his own accounts. The bench notices.', effects:{ setFlag:'old_custom_resolve', setFlag2:'old_custom_won', prestige:6, skills:{ste:1} } },
      failure:{ text:'The steward finds three errors before you finish the first column.', effects:{ setFlag:'old_custom_resolve', setFlag2:'old_custom_lost', prestige:-4 } } },
    { label:'Read the oldest words you found.', desc:'Old ink against new ambition.', chance:'rights_lea', effects:{ clearFlag:'old_custom_3' },
      success:{ text:'The old formula leaves little room to wriggle. The right is older than the reeve’s office.', effects:{ setFlag:'old_custom_resolve', setFlag2:'old_custom_won', prestige:6, skills:{lea:1} } },
      failure:{ text:'The record speaks of another field, or perhaps another village. The case collapses in the reading.', effects:{ setFlag:'old_custom_resolve', setFlag2:'old_custom_lost', prestige:-4 } } },
    { label:'Prove that the reeve means to rob lord and village alike.', desc:'Expose the thief — but slander cuts both ways.', chance:'rights_int', effects:{ clearFlag:'old_custom_3' },
      success:{ text:'A concealed tally and a frightened clerk do what righteous speeches could not.', effects:{ setFlag:'old_custom_resolve', setFlag2:'old_custom_won', prestige:6, skills:{int:1} } },
      failure:{ text:'The accusation lands as slander. The steward fines insolence as well as defeat.', effects:{ setFlag:'old_custom_resolve', setFlag2:'old_custom_lost', gold:-5, prestige:-5 } } },
    { label:'Buy a narrow settlement. ({money:10})', require:{ goldMin:10 }, desc:'Purchase peace, and accept a smaller right.',
      effects:{ gold:-10, clearFlag:'old_custom_3', setFlag:'old_custom_resolve', setFlag2:'old_custom_compromise' } },
    { label:'Testify for the reeve.', require:{ flags:['rights_collaborator'] }, desc:'Finish the betrayal you were paid to begin.',
      effects:{ gold:8, clearFlag:'old_custom_3', setFlag:'old_custom_resolve', setFlag2:'old_custom_betrayed', opinion:{role:'lord', amt:10}, popularOpinion:-10 } }
  ]},

{ id:'old_custom_end', title:'What Is Remembered',
  trigger:{ flags:['old_custom_resolve'] }, weight:80, once:true,
  text:'The stakes, the hearing, and the names spoken there will be remembered. What matters now is what your household carries away.',
  options:[
    { label:'Bind the right to every hearth.', require:{ flags:['old_custom_won'], notHoldings:['common_rights'] }, desc:'Make the victory outlive those who won it.',
      effects:{ holding:'common_rights', prestige:15, popularOpinion:10, opinion:{role:'lord', amt:-5}, clearFlag:'old_custom_resolve', clearFlag2:'old_custom_won', log:'Secured the ancient rights of common.' } },
    { label:'Renew the right already held by your house.', require:{ flags:['old_custom_won'], holdings:['common_rights'] }, desc:'Confirm in ink what your house already holds.',
      effects:{ prestige:15, popularOpinion:10, opinion:{role:'lord', amt:5}, clearFlag:'old_custom_resolve', clearFlag2:'old_custom_won' } },
    { label:'Ask for your freedom as the price.', require:{ flags:['old_custom_won'], tierMax:0 }, desc:'Trade the village’s gain for your own chains broken.',
      effects:{ serfFreedom:{route:'old_custom'}, prestige:15, popularOpinion:-5, opinion:{role:'lord', amt:10}, clearFlag:'old_custom_resolve', clearFlag2:'old_custom_won' } },
    { label:'Ask instead for a place in the lord’s service.', require:{ flags:['old_custom_won'], tierMin:1, tierMax:2 }, desc:'Turn victory into a step up the ladder.',
      effects:{ prestige:20, popularOpinion:-3, opinion:{role:'lord', amt:25}, clearFlag:'old_custom_resolve', clearFlag2:'old_custom_won' } },

    { label:'Accept the narrow peace.', require:{ flags:['old_custom_compromise'] }, desc:'Take what was offered and call it enough.',
      effects:{ prestige:8, opinion:{role:'lord', amt:10}, clearFlag:'old_custom_resolve', clearFlag2:'old_custom_compromise' } },
    { label:'Pay for full confirmation. ({money:12})', require:{ flags:['old_custom_compromise'], goldMin:12, notHoldings:['common_rights'] }, desc:'Coin seals what the bench left half-open.',
      effects:{ gold:-12, holding:'common_rights', prestige:10, popularOpinion:6, clearFlag:'old_custom_resolve', clearFlag2:'old_custom_compromise', log:'Bought confirmation of the household’s common rights.' } },
    { label:'Pull the stakes down after dark.', require:{ flags:['old_custom_compromise'], notHoldings:['common_rights'] }, desc:'Undo by night what was done by day — if unseen.', chance:'skill_int',
      effects:{ clearFlag:'old_custom_resolve', clearFlag2:'old_custom_compromise' },
      success:{ text:'By dawn no stake stands and no witness remembers a face. Use becomes custom once more.', effects:{ holding:'common_rights', prestige:8, opinion:{role:'lord', amt:-15}, skills:{int:1} } },
      failure:{ text:'The reeve’s men are waiting among the trees.', effects:{ health:-2, gold:-8, opinion:{role:'lord', amt:-20} } } },

    { label:'Pay the amercement. ({money:8})', require:{ flags:['old_custom_lost'], goldMin:8 }, desc:'Buy your way out of the judgment’s teeth.',
      effects:{ gold:-8, prestige:4, clearFlag:'old_custom_resolve', clearFlag2:'old_custom_lost' } },
    { label:'Take the punishment for everyone.', require:{ flags:['old_custom_lost'] }, desc:'One back bent so the village stands straight.',
      effects:{ health:-2, prestige:6, popularOpinion:12, clearFlag:'old_custom_resolve', clearFlag2:'old_custom_lost' } },
    { label:'Endure the judgment and remember.', require:{ flags:['old_custom_lost'] }, desc:'Swallow defeat; grudges keep longer than grain.',
      effects:{ prestige:2, clearFlag:'old_custom_resolve', clearFlag2:'old_custom_lost' } },

    { label:'Take the reeve’s purse and office.', require:{ flags:['old_custom_betrayed'] }, desc:'Wear the chain you helped fasten on others.',
      effects:{ gold:20, prestige:4, popularOpinion:-20, opinion:{role:'lord', amt:25}, addTrait:'deceitful', clearFlag:'old_custom_resolve', clearFlag2:'old_custom_betrayed', log:'Profited from the closing of the common.' } },
    { label:'Confess, and expose what the reeve paid for.', require:{ flags:['old_custom_betrayed'] }, desc:'Buy back your name with the truth.',
      effects:{ piety:8, popularOpinion:10, prestige:-4, opinion:{role:'lord', amt:-15}, clearFlag:'old_custom_resolve', clearFlag2:'old_custom_betrayed' } }
  ]},

/* ================= MEDIUM STORIES — two events each ================= */
{ id:'mill_will_not_turn', title:'The Wheel Will Not Turn',
  trigger:{ tierMax:2, minAge:16, seasons:[1,2], chance:0.25 }, weight:10, once:true,
  text:'The mill wheel shudders to a stop with half the village’s grain waiting and rain in the air. Spoiled grain feeds nobody, but the miller still speaks of his toll.',
  options:[
    { label:'Put shoulder and tools to the gearing.', desc:'Fix it yourself and be owed — or limp home.', chance:'skill_ste', effects:{ setFlag:'mill_path_repair', queue:'mill_reckoning' },
      success:{ text:'By dusk the wheel turns again. Every sack behind yours was saved by your hands.', effects:{ gold:4, prestige:4, skills:{ste:1} } },
      failure:{ text:'The timber shifts at the wrong moment. The wheel remains still and you limp home.', effects:{ health:-1 } } },
    { label:'Carry the grain to another mill.', desc:'Costly and weary, but the grain gets ground.', effects:{ gold:-2, health:-1, setFlag:'mill_path_carry', queue:'mill_reckoning' } },
    { label:'Load it on the pack mule.', require:{ holdings:['pack_mule'] }, desc:'Let the beast carry what the road demands.',
      effects:{ gold:-1, setFlag:'mill_path_carry', queue:'mill_reckoning' } },
    { label:'Grind secretly and deny the toll.', desc:'Poor flour, quietly made, is still flour.', chance:'skill_int', effects:{ setFlag:'mill_path_secret', queue:'mill_reckoning' },
      success:{ text:'The hand-querns turn behind shuttered doors. The flour is poor, but it is yours.', effects:{ gold:2, skills:{int:1} } },
      failure:{ text:'Flour dust and gossip travel equally well. The miller knows.', effects:{ opinion:{role:'lord', amt:-5} } } },
    { label:'Ask {lord} to suspend the toll.', desc:'A fair plea — if the lord is feeling fair.', chance:'skill_dip', effects:{ setFlag:'mill_path_appeal', queue:'mill_reckoning' },
      success:{ text:'The request is judged reasonable. The miller is told to swallow the loss.', effects:{ opinion:{role:'lord', amt:5}, prestige:2 } },
      failure:{ text:'A toll is a toll, you are told, whether or not the wheel turned.', effects:{ } } }
  ]},

{ id:'mill_reckoning', title:'The Miller’s Reckoning', trigger:{ never:true },
  text:'The miller arrives with his tally. Broken wheel or not, he says the lord is owed his customary share.',
  options:[
    { label:'Demand payment for the work you did.', require:{ flags:['mill_path_repair'] }, desc:'The savior of the mill argues his wage.', chance:'skill_dip', effects:{ clearFlag:'mill_path_repair' },
      success:{ text:'The miller pays rather than explain to the village why its savior owes him coin.', effects:{ gold:6, prestige:6, skills:{dip:1} } },
      failure:{ text:'He calls the repair a tenant’s duty and takes the toll besides.', effects:{ gold:-4 } } },
    { label:'Take a season’s freedom from toll instead.', require:{ flags:['mill_path_repair'] }, desc:'A lighter tally for seasons to come.',
      effects:{ prestige:3, clearFlag:'mill_path_repair' } },
    { label:'Show that a failed mill voids its toll.', require:{ flags:['mill_path_carry'] }, desc:'Quote custom against his tally.', chance:'skill_lea', effects:{ clearFlag:'mill_path_carry' },
      success:{ text:'The old custom is plain enough. The tally closes without your name.', effects:{ prestige:5, opinion:{role:'lord', amt:3}, skills:{lea:1} } },
      failure:{ text:'The words are less plain than you hoped. Two millers now want paying.', effects:{ gold:-5 } } },
    { label:'Pay both millers and be done. ({money:4})', require:{ flags:['mill_path_carry'] }, desc:'Expensive, but it ends the matter.',
      effects:{ gold:-4, clearFlag:'mill_path_carry' } },
    { label:'Deny there was ever another quern.', require:{ flags:['mill_path_secret'] }, desc:'A lie that holds is as good as the truth.', chance:'skill_int', effects:{ clearFlag:'mill_path_secret' },
      success:{ text:'He finds neither flour nor witness, and leaves with an empty tally.', effects:{ skills:{int:1} } },
      failure:{ text:'A child points directly at the hidden sack. The fine is immediate.', effects:{ gold:-6, prestige:-3 } } },
    { label:'Pay the fine before it grows. ({money:6})', require:{ flags:['mill_path_secret'], goldMin:6 }, desc:'Settle cheaply before the tally swells.',
      effects:{ gold:-6, clearFlag:'mill_path_secret', opinion:{role:'lord', amt:2} } },
    { label:'Press the appeal one last time.', require:{ flags:['mill_path_appeal'] }, desc:'One more word before the lord’s patience ends.', chance:'skill_dip', effects:{ clearFlag:'mill_path_appeal' },
      success:{ text:'The lord confirms the waiver and rebukes the miller for greed.', effects:{ prestige:6, opinion:{role:'lord', amt:5}, skills:{dip:1} } },
      failure:{ text:'The lord tires of the question. The toll stands.', effects:{ gold:-4, opinion:{role:'lord', amt:-3} } } },
    { label:'Accept the lord’s judgment.', require:{ flags:['mill_path_appeal'] }, desc:'Bow, pay, and keep the lord’s regard.',
      effects:{ gold:-4, opinion:{role:'lord', amt:3}, clearFlag:'mill_path_appeal' } }
  ]},

{ id:'masters_empty_bench', title:'The Master’s Empty Bench',
  trigger:{ tierMin:1, tierMax:2, minAge:16, professions:['craftsman'], chance:0.3 }, weight:12, once:true,
  text:'Your old master dies with a commission unfinished, debts in the ledger, and a widow facing men who have already begun measuring the workshop.',
  options:[
    { label:'Finish the commission yourself.', desc:'Your hands against the master’s shadow.', chance:'skill_ste', effects:{ setFlag:'bench_path_finish', queue:'bench_mark' },
      success:{ text:'The work comes together beneath hands the master trained.', effects:{ skills:{ste:1}, prestige:3 } },
      failure:{ text:'Good material becomes expensive scrap. The widow says nothing.', effects:{ gold:-3 } } },
    { label:'Advance the widow {money:6} for materials.', require:{ goldMin:6 }, desc:'Charity that may yet return with thanks.',
      effects:{ gold:-6, piety:3, setFlag:'bench_path_advance', queue:'bench_mark' } },
    { label:'Examine the master’s ledger.', desc:'Debts tell stories the grieving cannot.', chance:'skill_lea', effects:{ setFlag:'bench_path_ledger', queue:'bench_mark' },
      success:{ text:'The patron has paid less than half while claiming to have paid all.', effects:{ skills:{lea:1} } },
      failure:{ text:'Figures wander across the page without yielding a useful truth.', effects:{ } } },
    { label:'Buy the tools and obligations together. ({money:12})', require:{ goldMin:12 }, desc:'Take on the bench, debts and all.',
      effects:{ gold:-12, setFlag:'bench_path_buy', queue:'bench_mark' } },
    { label:'A dead master’s debts are not yours.', desc:'Walk away, and let the village judge.', effects:{ prestige:-2 } }
  ]},

{ id:'bench_mark', title:'Whose Mark Is It?', trigger:{ never:true },
  text:'The patron arrives with guildsmen and sharp eyes. The work, the tools, and the widow’s livelihood will be decided before they leave.',
  options:[
    { label:'Finish it beneath the master’s mark.', require:{ flags:['bench_path_finish'] }, desc:'Honor the dead, and hope the craft honors you.', chance:'skill_ste', effects:{ clearFlag:'bench_path_finish' },
      success:{ text:'The patron pays, and the masters praise a loyalty that did not cheapen the craft.', effects:{ gold:8, prestige:8, piety:5, skills:{ste:1} } },
      failure:{ text:'The work is accepted at half price. Loyalty cannot plane a warped board.', effects:{ gold:2 } } },
    { label:'Put your own mark upon it.', require:{ flags:['bench_path_finish'] }, desc:'Claim the glory — if the guild allows ambition.', chance:'skill_ste', effects:{ clearFlag:'bench_path_finish' },
      success:{ text:'The piece bears your name, and buyers begin asking after it.', effects:{ gold:14, prestige:10, skills:{ste:1} } },
      failure:{ text:'The masters call it presumption and make certain the market hears.', effects:{ prestige:-10 } } },
    { label:'Defend the widow’s right to finish the trade.', require:{ flags:['bench_path_advance'] }, desc:'Stand between her and the closed ranks.', chance:'skill_dip', effects:{ clearFlag:'bench_path_advance' },
      success:{ text:'The bench remains hers, and your advance returns with grateful thanks.', effects:{ gold:6, prestige:8, piety:5, skills:{dip:1} } },
      failure:{ text:'The masters close ranks. Your silver bought only a little time.', effects:{ piety:3 } } },
    { label:'Let the gift stand without argument.', require:{ flags:['bench_path_advance'] }, desc:'Charity asked for is charity halved.',
      effects:{ piety:8, popularOpinion:5, clearFlag:'bench_path_advance' } },
    { label:'Use the ledger to demand the true price.', require:{ flags:['bench_path_ledger'] }, desc:'His own seal against his own word.', chance:'skill_int', effects:{ clearFlag:'bench_path_ledger' },
      success:{ text:'Faced with his own seal and figures, the patron pays what he owes.', effects:{ gold:12, prestige:6, skills:{int:1} } },
      failure:{ text:'He calls the figures a dead man’s fraud and your demand extortion.', effects:{ prestige:-8, opinion:{role:'lord', amt:-3} } } },
    { label:'Take the tools you bought.', require:{ flags:['bench_path_buy'], notHoldings:['fine_tools'] }, desc:'The bench is yours now, for better or worse.',
      effects:{ holding:'fine_tools', prestige:4, clearFlag:'bench_path_buy', log:'Bought a dead master’s tools and obligations.' } },
    { label:'Sell the duplicate tools.', require:{ flags:['bench_path_buy'], holdings:['fine_tools'] }, desc:'Turn surplus iron back into silver.',
      effects:{ gold:10, prestige:4, clearFlag:'bench_path_buy' } }
  ]},

{ id:'words_before_dawn', title:'Words Before Dawn',
  trigger:{ tierMax:2, minAge:16, chance:0.16 }, weight:8, once:true,
  text:'A dying householder names who should receive the best beast, the tools, the household goods, and a final gift to the {temple}. There is no clerk — only breath, witnesses, and very little time.',
  options:[
    { label:'Commit every word to memory.', desc:'A dying man’s will, carried in your skull.', chance:'skill_lea', effects:{ setFlag:'testament_memory', queue:'testament_challenge' },
      success:{ text:'The phrasing fixes itself in your mind as if written there.', effects:{ setFlag:'testament_proof', skills:{lea:1} } },
      failure:{ text:'By dawn, three vital words have three possible meanings.', effects:{ } } },
    { label:'Gather two more witnesses.', desc:'More ears, less argument — if they arrive in time.', chance:'skill_dip', effects:{ setFlag:'testament_witnesses', queue:'testament_challenge' },
      success:{ text:'Three households hear the same words and agree upon them.', effects:{ setFlag:'testament_proof', skills:{dip:1} } },
      failure:{ text:'One arrives too late; the other is kin to the expected claimant.', effects:{ } } },
    { label:'Inventory and seal the goods.', desc:'Count it before someone’s cousin does.', chance:'skill_ste', effects:{ setFlag:'testament_seal', queue:'testament_challenge' },
      success:{ text:'Every tool and animal is counted before anyone can spirit it away.', effects:{ setFlag:'testament_proof', skills:{ste:1} } },
      failure:{ text:'A chest is already open and nobody admits touching it.', effects:{ } } },
    { label:'Shade the wording for a promised fee.', desc:'A little bend in the truth, for ready coin.', chance:'skill_int', effects:{ setFlag:'testament_crooked', queue:'testament_challenge' },
      success:{ text:'The favored claimant presses three coins into your hand.', effects:{ gold:3, skills:{int:1}, piety:-3 } },
      failure:{ text:'The offer was a test. Your reputation reaches the door before you do.', effects:{ prestige:-5, piety:-3 } } },
    { label:'Refuse the responsibility.', desc:'Another man’s will is another man’s burden.', effects:{ } }
  ]},

{ id:'testament_challenge', title:'The Claimant’s Challenge', trigger:{ never:true },
  text:'A kinsman rejects the last words and demands the goods. The local court wants something firmer than grief.',
  options:[
    { label:'Recite the words exactly.', require:{ flags:['testament_memory','testament_proof'] }, desc:'Memory under fire — one slip unravels all.', chance:0.8, effects:{ clearFlag:'testament_memory' },
      success:{ text:'Question follows question; the wording never changes. The testament stands.', effects:{ gold:4, prestige:8, piety:6 } },
      failure:{ text:'One phrase slips. The claimant drives a wedge into the uncertainty.', effects:{ prestige:-3 } } },
    { label:'Bring every witness forward.', require:{ flags:['testament_witnesses','testament_proof'] }, desc:'Many tongues, one testament — if they hold.', chance:0.75, effects:{ clearFlag:'testament_witnesses' },
      success:{ text:'Too many honest voices agree for the claimant to overcome them.', effects:{ gold:4, prestige:8, piety:6 } },
      failure:{ text:'Under pressure, the witnesses remember different gifts.', effects:{ prestige:-3 } } },
    { label:'Break the seal and read the inventory.', require:{ flags:['testament_seal','testament_proof'] }, desc:'Let the seals answer what grief cannot.', chance:0.8, effects:{ clearFlag:'testament_seal' },
      success:{ text:'Nothing is missing and every mark is witnessed. The division proceeds.', effects:{ gold:5, prestige:8, piety:5 } },
      failure:{ text:'One seal is damaged. Suspicion swallows the rest of the evidence.', effects:{ prestige:-3 } } },
    { label:'Admit the proof is uncertain and refer it upward.', require:{ notFlags:['testament_proof'], flags:['testament_memory'] }, desc:'Honest doubt costs little; false certainty costs more.',
      effects:{ piety:2, opinion:{role:'lord', amt:3}, clearFlag:'testament_memory' } },
    { label:'Admit the witnesses are uncertain and refer it upward.', require:{ notFlags:['testament_proof'], flags:['testament_witnesses'] }, desc:'Pass the quarrel to a higher bench.',
      effects:{ piety:2, opinion:{role:'lord', amt:3}, clearFlag:'testament_witnesses' } },
    { label:'Admit the inventory is uncertain and refer it upward.', require:{ notFlags:['testament_proof'], flags:['testament_seal'] }, desc:'Let wiser heads weigh what yours could not.',
      effects:{ piety:2, opinion:{role:'lord', amt:3}, clearFlag:'testament_seal' } },
    { label:'Sell the testimony as promised.', require:{ flags:['testament_crooked'] }, desc:'Keep the crooked bargain, and pray no one talks.', chance:'skill_int', effects:{ clearFlag:'testament_crooked' },
      success:{ text:'Your chosen version becomes the court’s version. The claimant pays well.', effects:{ gold:12, piety:-8, skills:{int:1} } },
      failure:{ text:'Another witness names the bargain aloud. The court turns on you.', effects:{ prestige:-10, piety:-5, opinion:{role:'lord', amt:-8} } } },
    { label:'Repent and tell the court about the bribe.', require:{ flags:['testament_crooked'] }, desc:'Lose the coin, keep your soul.',
      effects:{ piety:6, prestige:-2, clearFlag:'testament_crooked' } }
  ]},

/* ================= LOWER-STATION ONE-OFFS ================= */
{ id:'after_reapers', title:'After the Reapers',
  trigger:{ tierMax:2, minAge:16, seasons:[2], chance:0.12 }, weight:6, cooldown:12,
  text:'A poor household moves through the stubble, gathering fallen stalks before everyone agrees the harvest is finished. There is little grain in their sack, but less in their house.',
  options:[
    { label:'Let them glean in peace.', desc:'Mercy costs a handful of stalks.', effects:{ piety:5, popularOpinion:4 } },
    { label:'Hire them to thresh. ({money:2})', require:{ goldMin:2 }, desc:'Wages for hunger — labor that may pay double.', chance:'skill_ste', effects:{ gold:-2 },
      success:{ text:'Their labor saves more grain than their wages cost.', effects:{ gold:5, popularOpinion:4, skills:{ste:1} } },
      failure:{ text:'Rain comes before the last sheaf is beaten. At least the household ate.', effects:{ piety:3 } } },
    { label:'Share fruit from the orchard instead.', require:{ holdings:['orchard'] }, desc:'What the tree gives freely costs you little.', effects:{ piety:7, popularOpinion:5 } },
    { label:'Keep every stalk.', desc:'Full barns, thin neighbors, long memories.', effects:{ gold:3, piety:-3, popularOpinion:-4 } }
  ]},

{ id:'bad_silver', title:'Bad Silver',
  trigger:{ tierMax:2, minAge:16, goldMin:1, chance:0.1 }, weight:5, cooldown:12,
  text:'Two coins in your payment are thin at the edge and wrong in the color. They may be foreign, clipped, or simply made by a liar.',
  options:[
    { label:'Weigh and test them.', desc:'Catch the lie before it leaves your palm.', chance:'skill_ste',
      success:{ text:'The balance reveals the fraud before the seller leaves.', effects:{ gold:2, prestige:3, skills:{ste:1} } },
      failure:{ text:'Your test proves nothing. By the time another man spots the clipping, the seller is gone.', effects:{ gold:-2 } } },
    { label:'Read the mint and ruler on the face.', desc:'Strange letters may mean honest foreign coin.', chance:'skill_lea',
      success:{ text:'Foreign, not false — and worth slightly more than either of you knew.', effects:{ gold:3, skills:{lea:1} } },
      failure:{ text:'The worn letters offer no answer.', effects:{ } } },
    { label:'Pass them to the next fool.', desc:'Bad coin travels fast — and so do reputations.', chance:'skill_int',
      success:{ text:'The bad silver leaves your purse and becomes another household’s lesson.', effects:{ gold:3, piety:-2, skills:{int:1} } },
      failure:{ text:'The market catches the trick and remembers your face.', effects:{ prestige:-6, popularOpinion:-3 } } },
    { label:'Surrender them to the lord’s officer.', desc:'Take the loss; keep the lord’s good regard.', effects:{ gold:-2, prestige:3, opinion:{role:'lord', amt:5} } }
  ]},

{ id:'retinue_at_door', title:'The Retinue at the Door',
  trigger:{ tierMax:2, minAge:16, realmAtWar:true, chance:0.12 }, wartime:true, weight:6, cooldown:12,
  text:'Men wearing the lord’s colors fill the lane. They require food, fodder, and dry floor before they march again — and requirement sounds very much like command.',
  options:[
    { label:'Host them properly. ({money:5})', require:{ goldMin:5 }, desc:'A full table buys the captain’s goodwill.', effects:{ gold:-5, opinion:{role:'lord', amt:10}, prestige:3 } },
    { label:'Repair their gear for payment.', require:{ professions:['craftsman'] }, desc:'Earn from the war instead of feeding it.', chance:'skill_ste',
      success:{ text:'Straps, rivets, and wheels leave sounder than they arrived.', effects:{ gold:4, opinion:{role:'lord', amt:8}, skills:{ste:1} } },
      failure:{ text:'A hasty repair fails inspection. They take food in place of payment.', effects:{ gold:-3 } } },
    { label:'Trade supper for campaign gossip.', desc:'News is worth a meal — if the tales are true.', chance:'skill_int',
      success:{ text:'By midnight you know where the banners march and which captain fears whom.', effects:{ prestige:3, worldNews:true, skills:{int:1} } },
      failure:{ text:'Soldiers eat your supper and tell lies for sport.', effects:{ gold:-2 } } },
    { label:'Cite the custom limiting their demands.', desc:'Old words against hungry swords.', chance:'skill_lea',
      success:{ text:'The captain recognizes the words and takes only what is owed.', effects:{ prestige:4, skills:{lea:1} } },
      failure:{ text:'He interprets the custom differently, with six hungry men behind him.', effects:{ gold:-5, opinion:{role:'lord', amt:-8} } } },
    { label:'Bar the door.', desc:'Defy them to their faces, and pay if it fails.', chance:'battle',
      success:{ text:'The first man through finds himself back in the mud. The rest decide another roof is easier.', effects:{ prestige:5, opinion:{role:'lord', amt:-5} } },
      failure:{ text:'The door gives, then you do. They leave bruises and an empty larder.', effects:{ health:-1, gold:-4, opinion:{role:'lord', amt:-10} } } }
  ]},

{ id:'swarm_in_eaves', title:'A Swarm in the Eaves',
  trigger:{ tierMax:2, minAge:16, seasons:[0,1], chance:0.1 }, weight:5, cooldown:16,
  text:'A cloud of bees settles beneath the eaves, heavy with promise and noise. Honey keeps; wax sells; stings swell.',
  options:[
    { label:'Hive them with smoke and patience.', desc:'Sweet gold hangs heavy — and stings.', chance:'swarm',
      success:{ text:'The queen settles into the basket. By autumn there is honey enough to sell.', effects:{ gold:5, skills:{ste:1} } },
      failure:{ text:'The swarm takes offense and then takes flight.', effects:{ health:-1 } } },
    { label:'Ask {friend} to help.', require:{ hasRole:'friend' }, desc:'Shared work, shared honey, stronger friendship.', effects:{ gold:3, opinion:{role:'friend', amt:5} } },
    { label:'Give the first wax and honey to the {temple}.', desc:'The first sweetness goes to {god}.', effects:{ piety:6, opinion:{role:'priest', amt:5} } },
    { label:'Drive them away.', desc:'Some gifts are more trouble than honey.', effects:{ } }
  ]},

{ id:'ford_in_flood', title:'The Ford in Flood',
  trigger:{ tierMax:2, minAge:16, seasons:[0], terrains:['farmland','forest','hills','mountains','marsh'], chance:0.12 }, weight:6, cooldown:12,
  text:'Snowmelt has turned the ford brown and violent. A cart has slewed sideways in the current, with a family clinging to it as the water rises.',
  options:[
    { label:'Ride or swim out to them.', desc:'Heroism the whole road will remember — if you live.', chance:'battle',
      success:{ text:'One by one, every hand reaches the bank. The whole road saw who went first.', effects:{ prestige:7, popularOpinion:4, skills:{mar:1} } },
      failure:{ text:'The current hammers you against the cart before others drag everyone clear.', effects:{ health:-2, prestige:2 } } },
    { label:'Rig a rope and lever from the bank.', desc:'Clever hands may succeed where strong arms drown.', chance:'skill_ste',
      success:{ text:'The cart turns with the rope instead of against it. Wood, beasts, and people come free together.', effects:{ prestige:6, skills:{ste:1} } },
      failure:{ text:'The first rope parts and whips your hands raw.', effects:{ health:-1 } } },
    { label:'Put every bystander to work.', desc:'A crowd is a rope, if someone holds the end.', chance:'skill_dip',
      success:{ text:'A frightened crowd becomes a line of hands. Nobody is lost.', effects:{ prestige:4, popularOpinion:5, skills:{dip:1} } },
      failure:{ text:'Everyone shouts a different command until a stronger voice takes over.', effects:{ prestige:-2 } } },
    { label:'Run for more help.', desc:'Little glory, but no one drowns for your pride.', effects:{ prestige:1 } },
    { label:'Keep walking.', desc:'The river keeps its secrets; so will you.', effects:{ prestige:-2 } }
  ]},

/* ================= GENTRY LIFE ================= */
{ id:'gentry_rent_arrears', title:'The Rent-Day Tally',
  trigger:{ societalRoles:['gentry'], minAge:16, seasons:[2], chance:0.16 },
  weight:7, cooldown:12,
  text:'Rent day closes with one household absent from the tally. Their crop failed, the reeve says, but your own roof and obligations do not wait upon better weather.',
  options:[
    { label:'Grant them a season’s grace.', desc:'Mercy now may preserve a good tenant.',
      effects:{ gold:-3, piety:5, popularOpinion:5 } },
    { label:'Take labor in place of coin.', desc:'A fair debt can be paid by willing hands.',
      effects:{ gold:2, popularOpinion:2, skills:{ste:1}, traitProgress:{id:'rent_shrewd'} } },
    { label:'Order the reeve to collect in full.', desc:'A manor cannot run upon excuses.',
      effects:{ gold:6, popularOpinion:-5, prestige:2, traitProgress:{id:'rent_shrewd'} } }
  ]},
{ id:'gentry_guest_right', title:'A Guest at the Manor',
  trigger:{ societalRoles:['gentry'], minAge:16, chance:0.14 }, weight:6, cooldown:14,
  text:'A traveler of respectable family arrives after dark with a tired horse and a letter of introduction. Guest-right demands a place by the fire; prudence asks what trouble followed them.',
  options:[
    { label:'Offer the best chamber.', desc:'Generosity travels farther than any guest.',
      effects:{ gold:-4, prestige:6, piety:3 } },
    { label:'Share the fire and ask careful questions.', chance:'skill_int',
      desc:'Hospitality need not be blind.',
      success:{ text:'The tale is sound, and the guest repays caution with useful news.',
        effects:{ prestige:3, skills:{int:1}, worldNews:true } },
      failure:{ text:'Your questions turn welcome into insult.', effects:{ prestige:-3 } } },
    { label:'Send them to the village inn.', desc:'Courtesy at arm’s length is still courtesy.',
      effects:{ gold:-1 } }
  ]},

/* =========================================================================
   SWEET POLLY OLIVER — an unwed woman of low station, left behind when the
   man she fancies is swept into the war levy, cuts her hair, takes a man’s
   name, and follows him into the ranks. A stage-flag chain (polly_1 → … →
   polly_reunion) that unfolds across ~a year of slot days: enlist, drill, kit
   and pay, a shield-wall that can wound or kill, and a reunion she ends on her
   own terms — wed him, spurn him, or vanish a stranger. One of the few roads
   to martial skill open to women in the 867 world. Female, unwed, serf through
   gentry. The soldier she follows is spawned into the {suitor} role by
   FB.fns.polly_court (js/events.js); see docs/designs/events.md.
   ========================================================================= */

{ id:'polly_farewell', title:'The Company Marches', once:true,
  trigger:{ sex:'f', married:false, noRole:'suitor', tierMax:2, minAge:16, maxAge:35, notFlags:['courting','polly_ever'], chance:0.12 }, weight:12,
  text:{ default:'There is a young man of the next holding — quick to laugh, quicker to blush — and you had half a mind to make him yours. But the war has swallowed the season: the lord’s serjeants are taking every unwed man who can hold a spear, and this morning he stands in the muster line with a borrowed shield on his arm and no notion that you exist. By dusk the company will be a smudge of dust on the war road, and him with it. A woman does not follow an army. Everyone knows that.',
    muslim:'There is a young man of the next quarter — quick to laugh, quicker to blush — and you had half a mind to make him yours. But the war has swallowed the season: the amir’s men are calling up every unwed youth who can level a spear, and this morning he stands in the muster with a borrowed shield on his arm and no notion that you exist. By dusk the column will be a smudge of dust on the war-road, and him with it. A woman does not ride with an army, they say — but they have not read the old tales as closely as you have.',
    pagan:'There is a young man of the next steading — quick to laugh, quicker to blush — and you had half a mind to make him yours. But the war has swallowed the season: the chief’s men are taking every unwed lad who can hold a spear, and this morning he stands in the muster with a borrowed shield on his arm and no notion that you exist. By dusk the war-band will be a smudge of dust on the road, and him with it. They will say a woman has no place in the shield-ring. The old songs, which you know by heart, say otherwise.' },
  options:[
    { label:'Cut your hair and follow him to war.', desc:'Bind your chest, take a man’s name, and march. Madness — or the only road left.',
      effects:{ custom:'polly_court', setFlag:'polly_1', setFlag2:'polly_ever', prestige:2, log:'Cut off her braid and followed the muster to war.' } },
    { label:'Watch the dust settle, and let him go.', desc:'Some things are not to be. Swallow it, and stay who you are.',
      effects:{ } }
  ]},

/* The same chain, entered from the "💒 Propose marriage" deed: about a quarter
   of the time (js/actions.js) a low-station woman's intended is levied before
   he can answer. Fired with trigger:{never:true}; the suitor she is courting is
   already in the {suitor} role, so — unlike polly_farewell — this does NOT
   spawn one, and it clears the `courting` flag so the ordinary courtship events
   stand down while she is afield. polly_ever gates it to once per life. */
{ id:'polly_propose_war', title:'Answered by a War-Horn', trigger:{ never:true }, charCard:'suitor',
  text:{ default:'You have chosen your moment and rehearsed your words; today you mean to ask {suitor} for a life together. But the war reaches your door first. Even as you square your shoulders to speak, the lord’s serjeants are working down the lane — and {suitor}’s name is among those called, every unwed man who can hold a spear. There will be no answer today: only a borrowed shield thrust into his arms, and dust on the war road by dusk.',
    muslim:'You have chosen your moment and rehearsed your words; today you mean to ask {suitor} for a life together. But the war reaches your door first. Even as you square your shoulders to speak, the amir’s men are working down the lane — and {suitor}’s name is among those called, every unwed youth who can level a spear. There will be no answer today: only a borrowed shield thrust into his arms, and dust on the war-road by dusk.',
    pagan:'You have chosen your moment and rehearsed your words; today you mean to ask {suitor} for a life together. But the war reaches your door first. Even as you square your shoulders to speak, the chief’s men are working down the lane — and {suitor}’s name is among those called, every unwed lad who can hold a spear. There will be no answer today: only a borrowed shield thrust into his arms, and dust on the war-road by dusk.' },
  options:[
    { label:'Cut your hair and follow him to war.', desc:'If he cannot be given to you, go and take your place at his side — in a man’s clothes.',
      effects:{ clearFlag:'courting', setFlag:'polly_1', setFlag2:'polly_ever', prestige:2, log:'Cut off her braid and followed her intended to war.' } },
    { label:'Let him march, and wait for his return.', desc:'Keep the hearth, keep the faith, and pray the war gives him back to ask again.',
      effects:{ prestige:1, piety:3 } }
  ]},

{ id:'polly_enlist', title:'A Braid on the Barn Floor', once:true, charCard:'suitor',
  trigger:{ flags:['polly_1'], hasRole:'suitor' }, weight:60,
  text:'The shears bite; your braid coils on the barn floor and you are someone else. Chest bound flat under a dead brother’s shirt, voice pitched low, a man’s name ready on your tongue, you fall in at the tail of the column. Ahead in the ranks — close enough to see, too close to be safe — marches {suitor}, who does not know you from any other raw recruit.',
  options:[
    { label:'Learn the spear as if your life depends on it.', desc:'Because now it does. Hard drill, and no one looking too closely.',
      effects:{ clearFlag:'polly_1', setFlag:'polly_2', skills:{mar:1}, log:'Took a man’s name in the ranks.' } },
    { label:'Keep to the edges and copy the veterans.', desc:'Learn by watching; draw no eyes to a jaw too smooth.',
      effects:{ clearFlag:'polly_1', setFlag:'polly_2', skills:{mar:1}, prestige:1 } }
  ]},

{ id:'polly_drill', title:'The Drill-Yard', once:true, charCard:'suitor',
  trigger:{ flags:['polly_2'], hasRole:'suitor' }, weight:70,
  text:{ default:'Days blur into blisters and bruises. The serjeant’s stick finds every dropped shield, and the men wash and boast and sprawl with no thought for the slight recruit who always slips off alone. Your arms harden; the spear stops feeling like a stranger in your hands. And once, across the cook-fire, {suitor} passes you the bread without a second glance — and your treacherous heart nearly betrays you where the serjeant’s eye never could.',
    muslim:'Days blur into blisters and bruises. The drillmaster’s cane finds every dropped shield, and the men wash and boast and sprawl with no thought for the slight recruit who always slips off alone. Your arms harden; the spear stops feeling like a stranger in your hands. And once, across the cook-fire, {suitor} passes you the bread without a second glance — and your treacherous heart nearly betrays you where the drillmaster’s eye never could.',
    pagan:'Days blur into blisters and bruises. The grizzled spearman who drills the levy finds every dropped shield, and the men wash and boast and sprawl with no thought for the slight recruit who always slips off alone. Your arms harden; the spear stops feeling like a stranger in your hands. And once, across the cook-fire, {suitor} passes you the bread without a second glance — and your treacherous heart nearly betrays you where that hard old eye never could.' },
  options:[
    { label:'Throw yourself into the training.', desc:'Sweat now, live later — and grow strong enough to matter.',
      effects:{ clearFlag:'polly_2', setFlag:'polly_3', skills:{mar:2} } },
    { label:'Guard the secret above all else.', desc:'Bathe alone, sleep in your shirt, trust no one. Caution over glory.',
      effects:{ clearFlag:'polly_2', setFlag:'polly_3', skills:{mar:1, int:1} } },
    { label:'Win the men with a wineskin and a song.', desc:'Comrades who love you look less closely at you.', chance:'skill_dip',
      success:{ text:'You stand a round with your last coppers and bawl the filthy marching songs louder than any. They call you a good lad and mean it — and a good lad is never questioned.', effects:{ clearFlag:'polly_2', setFlag:'polly_3', skills:{mar:1}, gold:-2, prestige:3 } },
      failure:{ text:'You fumble a verse every farm boy has known since the cradle, and a one-eyed veteran squints at you a beat too long before he lets it pass.', effects:{ clearFlag:'polly_2', setFlag:'polly_3', skills:{mar:1} } } }
  ]},

{ id:'polly_arms', title:'The Paymaster’s Table', once:true, charCard:'suitor',
  trigger:{ flags:['polly_3'], hasRole:'suitor' }, weight:70,
  text:'Before a war is fought it must be paid for. The paymaster counts thin coins into every calloused palm — your first soldier’s wage, earned as a man — and the quartermaster’s cart stands open beside him: dented iron and stiff leather for anyone who came without their own. Kit yourself now; tomorrow the column turns toward the enemy.',
  options:[
    { label:'Take a good fighting knife from the cart.', desc:'A keen blade close at hand is worth more than the coppers it costs.',
      effects:{ clearFlag:'polly_3', setFlag:'polly_4', gold:4, giveItem:'keen_seax', skills:{mar:1} } },
    { label:'Take a padded jack for your back and ribs.', desc:'It will not stop a lance, but it has turned many a tired sword.',
      effects:{ clearFlag:'polly_3', setFlag:'polly_4', gold:6, giveItem:'padded_jack' } },
    { label:'Pocket every coin and trust your spear.', desc:'Coin keeps; borrowed iron does not. Travel light.',
      effects:{ clearFlag:'polly_3', setFlag:'polly_4', gold:8, skills:{mar:1} } }
  ]},

{ id:'polly_battle', title:'The Shield-Wall', once:true, charCard:'suitor',
  trigger:{ flags:['polly_4'], hasRole:'suitor' }, weight:80,
  text:'It is nothing like the drill-yard. The line locks shield to shield, the horns wail, and across a hundred paces of trampled barley the enemy comes on like a grey tide. Somewhere down the wall is {suitor}, white-knuckled on his spear. There is no hiding left now — only the wall, and whether you hold your span of it.',
  options:[
    { label:'Set your feet and hold the line.', desc:'Glory and grave both live in the shield-wall. Stand.', chance:'battle',
      success:{ text:'The world shrinks to the man in front of you — and then he is down, and their wall breaks and runs, and you are alive, shaking, splashed to the elbow, and alive. The field and its dead lie open for the looting.', effects:{ clearFlag:'polly_4', setFlag:'polly_reunion', gold:12, prestige:8, skills:{mar:1}, addTraitOnce:'veteran', log:'Held the shield-wall and lived.' } },
      failure:{ text:'The wall buckles where you least expect it. A blow you never see punches the wind and the sense clean out of you, and the rout washes over you like cold black water.', effects:{ clearFlag:'polly_4', setFlag:'polly_reunion', health:-4, addTrait:'scarred', custom:'polly_rout', deathProvenance:{ kind:'battle', province:'context', enemy:'realmWar' } } } },
    { label:'Fight your way along the line to {suitor}.', desc:'If you fall, fall at his shoulder. Reckless — and human.', chance:'battle',
      success:{ text:'You carve sideways through the press and plant yourself at his shoulder, a nameless recruit who fights like something loosed from a cage. Back to back you hold until the enemy breaks — and he stares at you as a man stares at a face he half-remembers from a dream.', effects:{ clearFlag:'polly_4', setFlag:'polly_reunion', gold:8, prestige:10, skills:{mar:2}, opinion:{role:'suitor', amt:15}, addTrait:'veteran', addTraitOnce:'brave', log:'Cut her way to her beloved’s shoulder and held.' } },
      failure:{ text:'You never reach him. The line folds first, and a spear-butt or a boot-heel — you will never know which — drops you into the churned mud as the rout howls past overhead.', effects:{ clearFlag:'polly_4', setFlag:'polly_reunion', health:-4, addTrait:'scarred', custom:'polly_rout', deathProvenance:{ kind:'battle', province:'context', enemy:'realmWar' } } } }
  ]},

{ id:'polly_reunion', title:'After the Field', once:true, charCard:'suitor',
  trigger:{ flags:['polly_reunion'], hasRole:'suitor' }, weight:90,
  text:{ default:'The fighting is done and the crows have come down to their work. Battered or triumphant, you find {suitor} among the living — and when you drag the helm off your cropped head and speak in your own true voice at last, he goes white, then red, then utterly and gratifyingly speechless. A year of blisters and terror and midnight fear, all for this face gaping at you like a fish just landed.',
    muslim:'The fighting is done and the carrion birds have come down to their work. Battered or triumphant, you find {suitor} among the living — and when you drag the helm off your cropped head and speak in your own true voice at last, he goes white, then red, then utterly and gratifyingly speechless. A year of blisters and terror and midnight fear, all for this face gaping at you like a fish just landed. Let the poets make of it what they will; they have sung of stranger women under armor.',
    pagan:'The fighting is done and the ravens have come down to their work. Battered or triumphant, you find {suitor} among the living — and when you drag the helm off your cropped head and speak in your own true voice at last, he goes white, then red, then utterly and gratifyingly speechless. A year of blisters and terror and midnight fear, all for this face gaping at you like a fish just landed. Let them keep their talk of a woman’s place; the skalds will know where you stood.' },
  options:[
    { label:'Take his hand — you did not cross a war to lose him now.', desc:'Wed him, and let the whole muddy camp make of it what it will.',
      effects:{ marry:'informal', prestige:10, clearFlag:'polly_reunion', log:'Wed the soldier she followed to war.' } },
    { label:'“I crossed a war to find you — and found I like myself better.”', desc:'Spurn him grandly. You have outgrown the blushing boy from the muster line.',
      effects:{ clearSuitor:true, prestige:6, popularOpinion:3, clearFlag:'polly_reunion', log:'Spurned her sweetheart and marched home her own woman.' } },
    { label:'Pull the helm back on and slip away a stranger.', desc:'Let him wonder to his grave who that soldier was. Keep the tale for yourself.',
      effects:{ clearSuitor:true, prestige:4, skills:{mar:1}, clearFlag:'polly_reunion', log:'Vanished from the field a stranger, and went home to her own life.' } }
  ]}

);
