/* =========================================================================
   Fallowborn — COMMON LIFE EVENTS (all walks of life)
   See docs/MODDING.md for the event schema. Quick key:
   trigger: conditions (tierMin/Max, professions, minAge, seasons[0-3],
            flags/notFlags, married, goldMin, chance, religionGroup...)
   weight:  likelihood vs other eligible events. once:true fires one time.
   cooldown: seasons before it can repeat.
   effects: gold/prestige/piety/health, skills:{mar:1}, addTrait, setFlag,
            opinion:{role,amt}, queue:'next_event_id', profession, tier...
   Text tokens: {name} {spouse} {lord} {priest} {friend} {rival} {suitor}
            {province} {realm} {god} {holy} {year}
   ========================================================================= */
window.FBDATA = window.FBDATA || {};
FBDATA.events = FBDATA.events || [];

FBDATA.events.push(

/* ---------- courtship & marriage ---------- */
{ id:'meet_suitor', title:'A Possible Match', charCard:'suitor',
  text:'Through kin and gossip you are introduced to {suitor}. There is a certain promise in the meeting — and marriage is how fortunes are made.',
  trigger:{ never:true }, /* fired by the "Seek a match" action */
  options:[
    { label:'Pursue this match.', desc:'Court them daily until their regard is won.', effects:{ setFlag:'courting', focusSet:'court_suitor' } },
    { label:'Not this one.', desc:'Not every road to fortune needs taking.', effects:{ clearSuitor:true } }
  ]},
{ id:'proposal_made', title:'The Question Is Asked', charCard:'suitor',
  trigger:{ never:true }, /* fired by the "Propose marriage" action */
  text:'Families gather, terms are weighed — your standing, your prospects, the size of your purse. You ask for the hand of {suitor}.',
  options:[
    { label:'Await the answer.', chance:'proposal', desc:'Your standing and your silver are on the scales now.',
      success:{ text:'It is agreed! Before {holy} and kin, you are wed to {suitor}.', effects:{ marry:true, prestige:15, log:'Married {spouse}.' } },
      failure:{ text:'The family refuses — politely, but firmly. Perhaps with more standing, or more silver…', effects:{ clearFlag:'courting', clearSuitor:true, prestige:-5 } } }
  ]},
{ id:'courting_above', title:'A Door Half-Shut', charCard:'suitor',
  trigger:{ flags:['courting'], custom:'suitor_above_station', chance:0.5 }, weight:12, cooldown:2,
  text:'The kin of {suitor} have taken your measure, and their looks are cold. Fine words at the gate, and behind them the plain question: what business has a {title} with their house?',
  options:[
    { label:'Let love be stubborn.', desc:'Keep calling, keep smiling.', effects:{ opinion:{role:'suitor', amt:4}, prestige:-2 } },
    { label:'Win the household with gifts.', require:{ goldMin:8 }, desc:'Gifts open doors that love alone cannot.', effects:{ gold:-8, opinion:{role:'suitor', amt:10} } },
    { label:'They are right. End it.', desc:'Some heights are not worth the climb.', effects:{ clearFlag:'courting', clearSuitor:true, log:'Gave up an ambitious courtship.' } }
  ]},
{ id:'wed_above', title:'Grand In-Laws',
  trigger:{ married:true, maxSeasonsSinceMarriage:4, custom:'wed_above_station', chance:0.6 }, weight:16, cooldown:40,
  text:'The kin of {spouse} never let you forget the height from which they stooped. Now a cousin writes: the family expects a favor of its new… relation.',
  options:[
    { label:'Oblige them handsomely.', require:{ goldMin:6 }, desc:'A favor bought now is peace kept at the high table.', effects:{ gold:-6, prestige:4, opinion:{role:'spouse', amt:8} } },
    { label:'You wed {spouse}, not the whole house.', desc:'Stand your ground, and let the marriage weather it.', effects:{ opinion:{role:'spouse', amt:-8}, prestige:1 } }
  ]},
{ id:'wed_below', title:'Tongues Wag',
  trigger:{ married:true, maxSeasonsSinceMarriage:4, custom:'wed_below_station', chance:0.6 }, weight:16, cooldown:40,
  text:'At the well and in the hall they whisper it: you married beneath yourself. {spouse} pretends not to hear.',
  options:[
    { label:'Let them talk. You chose well.', desc:'Gossip fades; a good marriage does not.', effects:{ opinion:{role:'spouse', amt:10}, prestige:-3 } },
    { label:'Grease the loudest tongues.', require:{ goldMin:5 }, desc:'A little silver buys a little silence.', effects:{ gold:-5 } }
  ]},
{ id:'wedding_gift', title:'A Wedding Gift',
  trigger:{ married:true, chance:0.5, maxSeasonsSinceMarriage:2 }, once:true, weight:20,
  text:{ default:'Well-wishers bring gifts to the new couple — a pig, a bolt of cloth, a few coins pressed into your palm.',
    muslim:'Well-wishers bring gifts to the new couple — a lamb, a bolt of cloth, a few coins pressed into your palm.',
    jewish:'Well-wishers bring gifts to the new couple — a lamb, a bolt of cloth, a few coins pressed into your palm.' },
  options:[ { label:'Fortune smiles.', desc:'Begin the marriage as you mean to go on.', effects:{ gold:8, opinion:{role:'spouse', amt:10} } } ]},

/* ---------- widowhood: what a grand house owes ----------
   Queued by FB.spouseDied when a spouse of higher station dies —
   widow_settlement if the marriage left no living child of that blood,
   house_claim if it did. ctx carries {late}, lateStation, childId. */
{ id:'widow_settlement', title:'What the House Owes', trigger:{ never:true },
  text:'The mourning is done, and the kin of {late} send a clerk with a strongbox and papers. What was settled on your marriage must now be paid out — though their faces say they would rather not.',
  options:[
    { label:'Take what is owed, with dignity.', desc:'What was promised is yours, no more and no less.',
      effects:{ custom:'dower_take', prestige:3, log:'Received a settlement from the house of {late}.' } },
    { label:'Press for the full portion.', desc:'The old custom names a widow’s third. Their clerks will argue.', chance:0.45,
      success:{ text:'Grumbling, they pay it out — the full portion, as the old custom names it.',
        effects:{ custom:'dower_take_full', log:'Pressed the house of {late} for the full portion.' } },
      failure:{ text:'Papers are produced; clerks smile thinly. You leave with hard words and an empty purse.',
        effects:{ prestige:-5 } } },
    { label:'Want nothing of theirs.', desc:'Walk away clean, and let them keep their guilt.',
      effects:{ prestige:6, piety:3, log:'Refused the silver of the house of {late}.' } }
  ]},
{ id:'house_claim', title:'Blood of the House', trigger:{ never:true },
  text:'{late} is dead — and {childname}, your child together, carries the blood of a house that never welcomed you. Now its kin gather to settle the inheritance, and every eye turns to your child.',
  options:[
    { label:'Press {childname}’s claim.', desc:'Your standing and cunning against their lawyers and pride.', chance:'house_claim',
      success:{ text:'Oaths are read, kin are counted — and the house yields. {childname} is named to the inheritance, and its stewardship falls to your side of the hearth.',
        effects:{ custom:'claim_won', prestige:20, log:'{childname} was acknowledged by the house of {late}.' } },
      failure:{ text:'The house closes ranks. Cold words, a grudging purse, and a door shut on {childname}’s name.',
        effects:{ custom:'claim_lost', prestige:-5, log:'The house of {late} shut its doors on {childname}.' } } },
    { label:'Sell the claim back to them.', desc:'A fat purse now, and no feud.',
      effects:{ custom:'claim_sold', log:'Sold {childname}’s claim on the house of {late}.' } },
    { label:'Let the claim sleep. The child needs no feud.', desc:'A quiet childhood is worth more than a lawsuit.',
      effects:{ piety:3, prestige:2, log:'Let {childname}’s claim on the house of {late} rest.' } }
  ]},
{ id:'annulment_plea', title:'A Flaw in the Vows', charCard:'spouse',
  trigger:{ never:true }, /* fired from the spouse's character sheet (Christians only) */
  text:'You lay your case before the church: some closeness of blood overlooked, some defect in the vows. The marriage to {spouse}, you argue, never truly was. Learned men stroke their beards; a donation changes hands.',
  options:[
    { label:'Press the plea.', desc:'15 gold and 20 piety ride on the church’s judgment.',
      require:{ goldMin:15, pietyMin:20 }, chance:'annulment',
      success:{ text:'The judgment comes down: null and void from the first day. {spouse} returns to their kin, and you stand free before {god}.',
        effects:{ gold:-15, piety:-20, custom:'annul_granted', log:'The church annulled the marriage.' } },
      failure:{ text:'The church finds the marriage sound — and your motives less so. The plea is refused; the donation is kept, and {spouse} learns what you tried.',
        effects:{ gold:-15, piety:-25, popularOpinion:-5, opinion:{role:'spouse', amt:-30} } } },
    { label:'Withdraw the plea.', desc:'Let sleeping vows lie.', effects:{ log:'Thought better of an annulment plea.' } }
  ]},

/* ---------- children ---------- */
{ id:'child_born_flavor', title:'New Life', trigger:{ never:true }, nameChild:true,
  text:'The midwife emerges, weary and smiling. {childname} is born — small, loud, and alive. Your line continues.',
  options:[
    { label:'{god} be praised.', desc:'Give thanks where thanks are due.', effects:{ piety:5, prestige:5 } },
    { label:'Another mouth to feed.', desc:'Joy and hunger arrive together.', effects:{ gold:-2 } } ]},
{ id:'child_fever', title:'A Child Burns With Fever',
  trigger:{ hasYoungChild:true, chance:0.3 }, weight:8, cooldown:8,
  text:'Your child {childname} lies shivering, skin like a stove-stone. The old women shake their heads.',
  options:[
    { label:'Pay for a physician.', require:{ goldMin:10 }, desc:'Silver for the best chance a child can have.', chance:0.75,
      success:{ text:'The fever breaks. The child will live.', effects:{ gold:-10 } },
      failure:{ text:'Coin could not buy what {god} would not give. The child is gone.', effects:{ gold:-10, killChild:true, health:-1 } } },
    { label:'Pray through the night.', chance:0.55, desc:'Put the child in {god}’s hands and keep vigil.',
      success:{ text:'By dawn the fever breaks. A small miracle.', effects:{ piety:8 } },
      failure:{ text:'By dawn the little body is still. You dig a small grave.', effects:{ piety:3, killChild:true, health:-1 } } }
  ]},
{ id:'child_comes_of_age', title:'Coming of Age', trigger:{ never:true },
  text:'{childname} is sixteen — no longer a child. No tutor shaped their years, so what has your household taught them?',
  options:[
    { label:'The value of hard work.', desc:'Callused hands never go hungry for long.', effects:{ educateChild:'ste' } },
    { label:'How to handle a blade.', desc:'A sharp edge settles many arguments.', effects:{ educateChild:'mar' } },
    { label:'Letters and numbers.', desc:'The quill opens doors the sword cannot.', effects:{ educateChild:'lea' } },
    { label:'How to read people.', desc:'Most battles are won across a table.', effects:{ educateChild:'dip' } }
  ]},
{ id:'child_educated', title:'The Lessons End', trigger:{ never:true },
  text:'{childname} turns sixteen. The years of lessons are over — schooled, drilled, and shaped by your design, a young adult of real promise now stands where the child once fidgeted.',
  options:[
    { label:'They will do the family proud.', desc:'The shaping is done; the world awaits.', effects:{ prestige:5 } },
    { label:'Now their true education begins.', desc:'Life teaches what no tutor can.', effects:{ } }
  ]},
{ id:'player_comes_of_age', title:'Coming of Age', trigger:{ never:true },
  text:'You are sixteen — grown, in the eyes of {god} and the law. No tutor shaped your years, so what has your family’s household taught you best?',
  options:[
    { label:'The value of hard work.', desc:'Sweat is the surest inheritance.', effects:{ skills:{ ste:3 } } },
    { label:'How to handle a blade.', desc:'Steel answers what words cannot.', effects:{ skills:{ mar:3 } } },
    { label:'Letters and numbers.', desc:'A literate mind is a quiet weapon.', effects:{ skills:{ lea:3 } } },
    { label:'How to read people.', desc:'Know men, and you need fear few of them.', effects:{ skills:{ dip:3 } } }
  ]},
{ id:'player_educated', title:'The Lessons End', trigger:{ never:true },
  text:'You turn sixteen. The years of lessons are over — whatever your tutors drilled into you, for good or ill, is yours to carry now.',
  options:[
    { label:'I will do the family proud.', desc:'The lessons are yours to spend now.', effects:{ prestige:5 } },
    { label:'Now my true education begins.', desc:'The world is the last and hardest tutor.', effects:{ } }
  ]},

/* ---------- health ---------- */
{ id:'winter_fever', title:'The Coughing Sickness',
  trigger:{ seasons:[3], chance:0.16, notFlags:['ill'] }, childhood:true, weight:10, cooldown:8,
  text:'A wet cough settles in your chest as the cold bites. Half the village is abed with it.',
  options:[
    { label:'Rest and broth.', desc:'Give the sickness a warm bed and time.', effects:{ health:-1, setFlag:'ill', log:'Took ill over winter.' } },
    { label:'Work through it.', chance:0.5, desc:'Sweat it out — or let it dig its claws in.',
      success:{ text:'You sweat it out at your labors.', effects:{ } },
      failure:{ text:'You collapse. The sickness digs deep.', effects:{ health:-2, setFlag:'ill' } } }
  ]},
{ id:'recovery', title:'On the Mend',
  trigger:{ flags:['ill'], chance:0.6 }, wartime:true, childhood:true, weight:30,
  text:'Strength returns to your limbs at last. The sickness has run its course.',
  options:[ { label:'Back to life.', desc:'The world kept turning without you.', effects:{ clearFlag:'ill', health:1 } } ]},
{ id:'bad_tooth', title:'A Rotten Tooth',
  trigger:{ minAge:25, chance:0.1 }, weight:4, cooldown:20,
  text:'A tooth throbs like a war-drum. The smith owns the only pliers in the village.',
  options:[
    { label:'Have it pulled.', desc:'Short pain, then peace — for a coin.', effects:{ health:-1, gold:-1, log:'Lost a tooth to the smith’s pliers.' } },
    { label:'Endure it.', desc:'Pain dulls with time. So they say.', effects:{ health:-1 } }
  ]},

/* ---------- faith ---------- */
{ id:'pilgrimage_call', title:'The Long Road Calls',
  trigger:{ minAge:18, chance:0.12, goldMin:15, notFlags:['on_campaign','in_prison'] }, weight:5, once:true,
  text:'Pilgrims pass through {province}, footsore and shining-eyed, bound for the holy places. Something in you stirs to follow.',
  options:[
    { label:'Take up the staff and go.', desc:'A long road, worn shoes, and a cleaner soul.', effects:{ gold:-15, piety:30, addTrait:'pilgrim', health:-1, prestige:10, log:'Went on pilgrimage.' } },
    { label:'Give alms instead.', desc:'Holiness by proxy, at a kinder price.', effects:{ gold:-5, piety:8 } },
    { label:'The road is for dreamers.', desc:'The holy places will manage without you.', effects:{ } }
  ]},
{ id:'sermon', title:'Words That Linger',
  trigger:{ chance:0.2, religionGroup:'christian' }, weight:4, cooldown:12,
  text:'{priest} preaches with unusual fire — of the rich man, the camel, and the needle’s eye.',
  options:[
    { label:'Take it to heart.', desc:'Good words, freely given, freely kept.', effects:{ piety:5, opinion:{role:'priest', amt:5} } },
    { label:'Doze in the back.', desc:'The sermon will keep; so will the bench.', effects:{ opinion:{role:'priest', amt:-5} } }
  ]},
{ id:'seek_blessing', title:'At the {temple}', trigger:{ never:true }, /* fired by the "Seek a blessing" deed */
  text:'Cool shadow and quiet within the {temple}. The {holy} hears you out, then asks what you would have of {god}.',
  options:[
    { label:'A blessing on the fields. (30 piety)', require:{ pietyMin:30, professions:['farmer'] },
      desc:'The next harvest will fare better.', effects:{ piety:-30, setFlag:'blessed_crops', log:'The fields were blessed.' } },
    { label:'A blessing on the sword. (30 piety)', require:{ pietyMin:30 },
      desc:'Grace rides with you into your next battle.', effects:{ piety:-30, setFlag:'blessed_war', log:'The sword was blessed.' } },
    { label:'Anointing for your sickness. (40 piety)', require:{ pietyMin:40, healthMax:6 },
      desc:'Ask {god} to knit what the flesh cannot.', effects:{ piety:-40, health:2, log:'Anointed against sickness.' } },
    { label:'A prayer for children. (25 piety)', require:{ pietyMin:25, married:true },
      desc:'Ask for the patter of small feet.', effects:{ piety:-25, setFlag:'blessed_union' } },
    { label:'The {holy} speaks well of you to your lord. (35 piety)', require:{ pietyMin:35 },
      desc:'A good word from the pulpit weighs with the great.',
      effects:{ piety:-35, opinionLiege:15, log:'The clergy praised your name at the manor.' } },
    { label:'Masses sung for your ancestors. (25 piety)', require:{ pietyMin:25 },
      desc:'The dead are honored, and the living speak of it.',
      effects:{ piety:-25, prestige:8, popularOpinion:4, log:'Masses were sung for the family dead.' } },
    { label:'A blessing upon your house. (30 piety)', require:{ pietyMin:30, married:true },
      desc:'Grace settles over hearth and home.',
      effects:{ piety:-30, opinion:{ role:'spouse', amt:20 }, log:'The house was blessed.' } },
    { label:'Only quiet prayer.', desc:'Ask nothing, want nothing.', effects:{ piety:2 } }
  ]},
{ id:'doubt', title:'A Dark Night of the Soul',
  trigger:{ minAge:30, chance:0.08 }, weight:3, once:true,
  text:'Lying awake, you wonder: does {god} see you at all? Has any of it mattered?',
  options:[
    { label:'Faith answers doubt.', desc:'Kneel until the kneeling feels true again.', effects:{ piety:10, addTrait:'zealous' } },
    { label:'Perhaps no one is watching.', desc:'Live as though the sky is empty.', effects:{ piety:-10, addTrait:'cynical' } },
    { label:'Sleep takes you before an answer comes.', desc:'Some questions keep until morning.', effects:{ } }
  ]},

/* ---------- friends & rivals ---------- */
{ id:'make_friend', title:'A Friendship Kindled',
  trigger:{ chance:0.15, noRole:'friend' }, weight:6,
  text:{ default:'Long hours shared with {friend} — work, jokes, a jug passed back and forth — have become something like brotherhood.',
    muslim:'Long hours shared with {friend} — work, jokes, a water-skin passed back and forth — have become something like brotherhood.' },
  options:[ { label:'A friend is rare wealth.', desc:'Hold fast; such luck does not come twice.', effects:{ opinion:{role:'friend', amt:40} } } ]},
{ id:'make_rival', title:'Bad Blood',
  trigger:{ chance:0.15, noRole:'rival' }, weight:6,
  text:'{rival} has taken against you — a slight, a dispute over a boundary stone, a look held too long. It festers.',
  options:[
    { label:'Ignore the fool.', desc:'Starve a quarrel and it dies quietly.', effects:{ } },
    { label:'Answer insult with insult.', desc:'Give as good as you get, publicly.', effects:{ opinion:{role:'rival', amt:-20}, prestige:2 } } ]},
{ id:'rival_scheme', title:'A Knife in the Dark Market',
  trigger:{ chance:0.2, hasRole:'rival', roleOpinionBelow:{role:'rival', value:-30} }, weight:6, cooldown:10,
  text:'{rival} has been spreading poison about you — theft, blasphemy, worse. People look at you differently now.',
  options:[
    { label:'Confront them before witnesses.', chance:0.6, desc:'Drag the poison into daylight and dare them to repeat it.',
      success:{ text:'They stammer and withdraw the words. The village laughs at them.', effects:{ prestige:8, opinion:{role:'rival', amt:-10} } },
      failure:{ text:'They double down, and the crowd murmurs against you.', effects:{ prestige:-8 } } },
    { label:'Let the lie die on its own.', desc:'Lies starve slower than truth feeds.', effects:{ prestige:-4 } },
    { label:'Repay them in kind.', desc:'Poison for poison, and yours brewed better.', effects:{ opinion:{role:'rival', amt:-15}, skills:{int:1} } }
  ]},
{ id:'friend_in_need', title:'A Friend in Need',
  trigger:{ chance:0.15, hasRole:'friend', goldMin:5 }, weight:5, cooldown:12,
  text:'{friend} comes to you at dusk, shame-faced. A debt is due, and the collector is not a patient man.',
  options:[
    { label:'Pay it. (5 gold)', desc:'A debt forgotten is a friend kept.', effects:{ gold:-5, opinion:{role:'friend', amt:25}, prestige:3 } },
    { label:'Offer sympathy only.', desc:'Kind words pay no collectors.', effects:{ opinion:{role:'friend', amt:-15} } }
  ]},

{ id:'sworn_aid', title:'The Oath Remembered',
  trigger:{ flags:['sworn_friend'], hasRole:'friend', goldMax:3, chance:0.4 }, weight:12, cooldown:12,
  text:'Word of your hard times reaches {friend}. The oath you swore was not words only: they arrive with a purse and no speeches.',
  options:[
    { label:'Take it, and remember.', desc:'Oaths, it turns out, can be eaten.', effects:{ gold:6, opinion:{role:'friend', amt:5} } },
    { label:'Refuse, with thanks.', desc:'Pride costs more than coin, and feeds less.', effects:{ prestige:3, opinion:{role:'friend', amt:10} } }
  ]},

/* ---------- plots (resolutions; queued by the Scheming focus) ---------- */
{ id:'plot_discovered', title:'The Web Trembles', trigger:{ never:true },
  text:'Someone has talked. Conversations die when you approach; eyes follow you out of rooms. The plot is known — or nearly.',
  options:[
    { label:'Abandon everything. Deny everything.', desc:'Cut every thread and swear there never was a web.', effects:{ custom:'plot_end', prestige:-5 } },
    { label:'Rush the final stroke NOW.', chance:0.35, desc:'Strike half-ready, and pray speed makes up for it.',
      success:{ text:'Half-ready proves ready enough — barely. What you sought, you seize, and the talkers fall silent.',
        effects:{ custom:'plot_end', prestige:6, skills:{int:2} } },
      failure:{ text:'Half-ready is not ready. The whole scheme collapses on your head in daylight.',
        effects:{ custom:'plot_end', prestige:-12, popularOpinion:-5, opinion:{role:'lord', amt:-10} } } }
  ]},
{ id:'plot_ruin_rival', title:'The Trap Closes', trigger:{ never:true },
  text:'Every thread is in place and {rival} suspects nothing. One word from you and the web draws tight.',
  options:[
    { label:'Spring the trap.', chance:'plot', desc:'One word, and {rival} falls — if the web holds.',
      success:{ text:'Debts, rumors, and old friends turn all at once. {rival} is ruined — everyone suspects you, and no one can prove it.',
        effects:{ custom:'plot_end', prestige:8, skills:{int:2}, opinion:{role:'rival', amt:-30}, log:'Brought a rival low by intrigue.' } },
      failure:{ text:'A thread snaps — a bought man sells you back. The whole village knows whose hand held the knife.',
        effects:{ custom:'plot_end', prestige:-10, opinion:{role:'rival', amt:-20}, popularOpinion:-5 } } },
    { label:'Let it go. Mercy — or nerves.', desc:'A sprung trap can catch the hunter.', effects:{ custom:'plot_end', piety:3 } }
  ]},
{ id:'plot_spouse_end', title:'The Cup Is Poured', trigger:{ never:true }, charCard:'spouse',
  text:'Everything is in place: the draught measured, the stair loosened, the witnesses elsewhere. {spouse} suspects nothing. One nod from you and it is done.',
  options:[
    { label:'Give the word.', chance:'plot', desc:'One nod, and the house mourns on cue.',
      success:{ text:'A sudden illness, the neighbors say. The house mourns, and none mourn louder than you.',
        effects:{ killRole:'spouse', custom:'plot_end', piety:-15, log:'Was widowed — suddenly, conveniently.' } },
      failure:{ text:'The cup is knocked aside — {spouse} reads your face and knows. What lives in your house now is not a marriage but a watch.',
        effects:{ custom:'plot_end', prestige:-15, piety:-10, popularOpinion:-10, opinion:{role:'spouse', amt:-80} } } },
    { label:'Stay your hand.', desc:'Some doors, once opened, never close.', effects:{ custom:'plot_end', piety:5, log:'Abandoned a dark design.' } }
  ]},
{ id:'plot_tithe_barn', title:'The Barn at Midnight', trigger:{ never:true },
  text:'The watchman is bought, the dogs are fed, and the cart waits in the alder grove. Tonight the lord’s plenty can become yours.',
  options:[
    { label:'Take the grain.', chance:'plot', desc:'One night’s nerve against a winter’s hunger.',
      success:{ text:'By dawn the sacks are hidden and the ledger is none the wiser. Winter holds no fear this year.',
        effects:{ custom:'plot_end', gold:12, skills:{int:1}, piety:-3 } },
      failure:{ text:'A new watchman, unbought. You run for the trees and leave your good name behind.',
        effects:{ custom:'plot_end', prestige:-8, opinion:{role:'lord', amt:-15}, health:-1 } } },
    { label:'Walk away from it.', desc:'Stolen bread is never quite free.', effects:{ custom:'plot_end', piety:5 } }
  ]},
{ id:'plot_court_whispers', title:'The Word in the Right Ear', trigger:{ never:true },
  text:'Months of patience have shaped the hall’s opinion the way water shapes stone. One final whisper will finish it.',
  options:[
    { label:'Speak the word.', chance:'plot', desc:'One whisper, if it lands, reshapes the hall.',
      success:{ text:'Your obstacle leaves court under a cloud, and his place in the lord’s regard falls quietly to you.',
        effects:{ custom:'plot_end', prestige:10, opinion:{role:'lord', amt:20}, skills:{int:2, dip:1} } },
      failure:{ text:'The whisper is traced back along the chain of mouths — to yours.',
        effects:{ custom:'plot_end', prestige:-8, opinion:{role:'lord', amt:-15} } } },
    { label:'Swallow it.', desc:'Unspoken words can never be traced.', effects:{ custom:'plot_end', piety:3 } }
  ]},
{ id:'plot_skim_taxes', title:'Two Sets of Books', trigger:{ never:true },
  text:'The false ledger is perfect — every hide and hearth accounted for, and a fifth of it quietly missing.',
  options:[
    { label:'Send the false count.', chance:'plot', desc:'The difference is yours — if no clerk looks twice.',
      success:{ text:'The liege’s clerks stamp it without a second glance. The difference is yours, this year and after.',
        effects:{ custom:'plot_end', gold:25, skills:{int:2} } },
      failure:{ text:'An honest clerk — the rarest hazard. The liege’s displeasure arrives with an audit.',
        effects:{ custom:'plot_end', gold:-15, opinionLiege:-25, prestige:-8 } } },
    { label:'Burn the false ledger.', desc:'Ashes make poor evidence.', effects:{ custom:'plot_end', piety:3 } }
  ]},

/* ---------- misc life ---------- */
{ id:'good_omen', title:'An Omen',
  trigger:{ chance:0.1 }, childhood:true, weight:3, cooldown:16,
  text:'A white hart crosses your path at dawn and pauses, regarding you. The old folk say such beasts mark men for great things.',
  options:[ { label:'Great things, then.', desc:'Take the sign and carry it lightly.', effects:{ prestige:3 } } ]},
{ id:'harsh_winter', title:'A Killing Cold',
  trigger:{ seasons:[3], chance:0.12, tierMax:2 }, weight:8, cooldown:12,
  text:'The frost comes early and stays like an unwanted guest. Firewood dwindles; the old and the weak begin to die.',
  options:[
    { label:'Share your wood with the neighbors.', desc:'Warmth given is remembered when the thaw comes.', effects:{ gold:-3, opinion:{role:'friend', amt:10}, piety:4, prestige:3 } },
    { label:'Look to your own hearth.', desc:'Charity freezes; family first.', effects:{ } }
  ]},
{ id:'drink_trouble', title:'One Cup Too Many',
  trigger:{ chance:0.1, minAge:16, notFlags:['in_prison'], religionGroups:['christian','pagan','jewish'] }, weight:4, cooldown:12,
  text:'The feast-ale flows, songs get louder, and someone insults someone’s mother. Fists are already rising.',
  options:[
    { label:'Wade in swinging.', chance:0.55, desc:'Glory or a ditch — the ale decides.',
      success:{ text:'You crack heads and emerge grinning, a small legend by morning.', effects:{ prestige:4, skills:{mar:1} } },
      failure:{ text:'You wake in a ditch, short a pouch and long a black eye.', effects:{ gold:-3, health:-1 } } },
    { label:'Slip out the back.', desc:'No songs are sung about the man who left early.', effects:{ } },
    { label:'Talk them all down.', chance:0.5, desc:'A cool tongue could spare many teeth — including yours.',
      success:{ text:'Somehow, you turn rage to laughter. Men remember it.', effects:{ prestige:5, skills:{dip:1} } },
      failure:{ text:'A stray fist finds you anyway.', effects:{ health:-1 } } }
  ]},
/* ---------- items: peddlers, offers, and finds ---------- */
{ id:'peddler_knock', title:'The Peddler’s Pack',
  trigger:{ minAge:16, goldMin:15, chance:0.08 }, weight:4, cooldown:16,
  text:'A peddler with a guarded pack and quick eyes asks, very quietly, after “a buyer of unusual things.”',
  options:[
    { label:'See what he carries.', desc:'Unusual things find unusual owners.', effects:{ custom:'offer_item' } },
    { label:'Send him on his way.', desc:'Curiosity is cheap; its prizes are not.', effects:{ } }
  ]},
{ id:'item_offer', title:'An Unusual Offer', trigger:{ never:true },
  text:'From wrappings of oiled cloth comes {item}. The price is {itemprice} gold — and worth it twice over, says the seller, to the right person.',
  options:[
    { label:'Buy it. ({itemprice} gold)', require:{ custom:'can_afford_item' }, desc:'Heavy coin for a thing that may outlast you.', effects:{ custom:'buy_item' } },
    { label:'Too rich for you.', desc:'Let some other purse be lightened.', effects:{ custom:'clear_item_offer' } }
  ]},
{ id:'artifact_found', title:'Out of the Earth',
  trigger:{ minAge:16, chance:0.03 }, weight:3, cooldown:40,
  text:'A plough-share catches; a spade follows. Out of the earth comes a thing of the old times, caked in clay and glinting beneath.',
  options:[
    { label:'Keep it.', desc:'The earth gives up its secrets rarely.', effects:{ custom:'find_artifact' } },
    { label:'Give it to the {temple}.', desc:'Old things belong to {god}, and the {holy} will remember.', effects:{ piety:12, opinion:{role:'priest', amt:10} } },
    { label:'Sell it quietly.', desc:'Clay-caked wonders still fetch bright coin.', effects:{ gold:30, piety:-2 } }
  ]},
{ id:'plot_locked_chest', title:'The Chest Sings', trigger:{ never:true },
  text:'The household sleeps; the dog knows you now. The chest waits where the steward believes nobody knows.',
  options:[
    { label:'Crack it.', chance:'plot', desc:'One careful hour against the dog’s memory.',
      success:{ text:'Coin — and something better than coin, wrapped in wool at the bottom.',
        effects:{ custom:'plot_loot', gold:8, skills:{int:1}, piety:-3 } },
      failure:{ text:'The dog remembered its duty after all. You go over the wall torn, and known.',
        effects:{ custom:'plot_end', prestige:-8, popularOpinion:-6, health:-1 } } },
    { label:'Leave it be.', desc:'Some chests are best left singing.', effects:{ custom:'plot_end', piety:3 } }
  ]},

/* ---------- settlements (fired by the "Go into town…" deed) ---------- */
{ id:'visit_village', title:'{settlement}', trigger:{ never:true },
  text:'Mud lanes, low roofs, and every face turning to mark the newcomer. {settlement} is small enough that nothing here goes unnoticed — including you.',
  options:[
    { label:'Trade at the village green.', desc:'Small coin, but honest.', effects:{ gold:2 } },
    { label:'Share news at the well.', desc:'Gossip is a currency too.', effects:{ skills:{dip:1}, worldNews:true } },
    { label:'Preach to the villagers.', require:{ professions:['monk','priest'] }, desc:'A ready ear is a small congregation.', effects:{ piety:4, popularOpinion:2 } },
    { label:'Hear the villagers’ grievances.', require:{ tierMin:3 }, desc:'The smallfolk remember who listened.', effects:{ popularOpinion:4, prestige:1 } },
    { label:'Rest at the ale-house.', require:{ religionGroups:['christian','pagan','jewish'] }, desc:'A bench, a cup, an hour’s peace.', effects:{ health:1 } },
    { label:'Rest at the way-house.', require:{ religionGroups:['muslim'] }, desc:'A quiet corner and a full cup.', effects:{ health:1 } }
  ]},
{ id:'visit_town', title:'{settlement}', trigger:{ never:true },
  text:'Market stalls, a smithy’s clangor, and strangers enough that no one stares. {settlement} has walls of a sort, laws of a sort, and coin for those who know their trade.',
  options:[
    { label:'Sell at the market.', chance:0.65, desc:'Good coin if the buyers are hungry.',
      success:{ text:'Good prices and quick hands. You come home heavier by a few coins.', effects:{ gold:4, skills:{ste:1} } },
      failure:{ text:'A slow market day. You barely cover the road.', effects:{ gold:1 } } },
    { label:'Look for paying work.', require:{ tierMax:1 }, chance:0.7, desc:'Strong backs are sometimes in demand.',
      success:{ text:'A wall wants mending and a wagon wants loading. Honest coin.', effects:{ gold:3 } },
      failure:{ text:'Too many hands, too little work.', effects:{ gold:1 } } },
    { label:'Call at the guild hall.', require:{ professions:['craftsman','merchant'] }, desc:'Masters keep the best work for their own.', effects:{ gold:2, skills:{ste:1} } },
    { label:'Try the hiring fair.', require:{ professions:['soldier'] }, chance:0.6, desc:'A spear is always worth something to someone.',
      success:{ text:'A merchant train needs spears for the road. Easy duty, fair pay.', effects:{ gold:4, skills:{mar:1} } },
      failure:{ text:'No one is hiring swords this season.', effects:{ } } },
    { label:'Hear the {holy} preach at the {temple}.', desc:'An hour of good words costs nothing.', effects:{ piety:3 } },
    { label:'Court the town’s notables.', require:{ tierMin:2 }, desc:'Useful names are learned over wine.', effects:{ prestige:3, skills:{dip:1} } },
    { label:'Ask after rare goods.', require:{ goldMin:15 }, desc:'Where coin gathers, curious things follow.', effects:{ custom:'offer_item' } }
  ]},
{ id:'visit_city', title:'{settlement}', trigger:{ never:true },
  text:'Gates like cliffs, streets like rivers. In {settlement} a fortune is made or lost every day, and nobody asks where you were born — only what you carry.',
  options:[
    { label:'Trade in the great market.', chance:0.6, desc:'Fortunes turn fast here, in both directions.',
      success:{ text:'The great market swallows all you brought and asks for more.', effects:{ gold:6, skills:{ste:1} } },
      failure:{ text:'A cutpurse thinner than a shadow. You feel the lightness at the gate.', effects:{ gold:-2 } } },
    { label:'Seek out a scholar’s teaching.', desc:'The city keeps wisdom for those who ask.', effects:{ skills:{lea:1}, research:2 } },
    { label:'Petition at the great houses.', require:{ tierMin:2 }, chance:0.55, desc:'A name in the right ledger opens doors.',
      success:{ text:'A door opens; a name is taken down. Doors remember.', effects:{ prestige:4, skills:{dip:1} } },
      failure:{ text:'Stewards and secretaries, all day. The great remain unseen.', effects:{ prestige:-1 } } },
    { label:'Hire your blade out.', require:{ professions:['soldier'] }, chance:'battle', desc:'Good pay, if harder men don’t want it too.',
      success:{ text:'Three nights guarding a nervous silk merchant. The pay is very good.', effects:{ gold:6, prestige:2 } },
      failure:{ text:'The work went to harder men — after one of them rearranged your face.', effects:{ health:-1 } } },
    { label:'Marvel at the great {temple}.', desc:'Stone raised to heaven lifts the heart with it.', effects:{ piety:4 } },
    { label:'Browse the dealers in rare goods.', require:{ goldMin:15 }, desc:'The strange and precious gather where money does.', effects:{ custom:'offer_item' } },
    { label:'Wander the pleasure quarter.', require:{ religionGroups:['christian','pagan','jewish'] }, desc:'Wine, music, and thinner pockets by morning.',
      effects:{ health:1, gold:-2, piety:-3 } },
    { label:'Linger in the bath-houses.', require:{ religionGroups:['muslim'] }, desc:'Steam soaks the road out of tired bones.',
      effects:{ health:1, gold:-1 } }
  ]},

/* ---------- childhood (a minor heir's years) ----------
   While the player is under 16 the engine fires ONLY childhood:true events,
   so every event here gates maxAge:15 and carries the tag. */
{ id:'child_lessons', title:'Letters in the Dust',
  trigger:{ maxAge:15, minAge:6, chance:0.3 }, childhood:true, weight:8, cooldown:8,
  text:'The {holy} traces letters in the dust with a stick and looks at you expectantly. Few children are offered even this much.',
  options:[
    { label:'Trace them until they stay.', desc:'Letters learned young are kept for life.', effects:{ skills:{lea:1}, piety:2, opinion:{role:'priest', amt:5} } },
    { label:'Slip away to the fields.', desc:'Sunshine teaches its own lessons.', effects:{ health:1, opinion:{role:'priest', amt:-3} } }
  ]},
{ id:'child_dare', title:'The Dare',
  trigger:{ maxAge:15, minAge:6, chance:0.25 }, childhood:true, weight:7, cooldown:6,
  text:'The old willow leans far over the millpond, and every child knows the dare: climb to the high branch and jump.',
  options:[
    { label:'Climb. Jump.', chance:0.6, desc:'Glory above, cold water below.',
      success:{ text:'A heartbeat of flight, a mighty splash, and the other children’s awe.', effects:{ prestige:2, skills:{mar:1} } },
      failure:{ text:'The branch gives early. The water is shallower than it looked.', effects:{ health:-1 } } },
    { label:'Walk away from it.', desc:'The willow will keep its dare for braver fools.', effects:{ } }
  ]},
{ id:'child_snares', title:'The Small Hunter',
  trigger:{ maxAge:15, minAge:6, tierMax:1, chance:0.25 }, childhood:true, weight:7, cooldown:6,
  text:'You have watched the older boys set snares along the hedgerow. Your fingers know the knots now, and supper is thin.',
  options:[
    { label:'Set your snares.', chance:0.6, desc:'Patient knots might fill a thin pot.',
      success:{ text:'Two birds and a rabbit. Tonight you are the pride of the table.', effects:{ gold:1, skills:{ste:1} } },
      failure:{ text:'Empty loops and one angry goose. There is always tomorrow.', effects:{ } } },
    { label:'The hedgerow can wait.', desc:'The birds keep; hunger is patient too.', effects:{ } }
  ]},
{ id:'child_bully', title:'The Big One',
  trigger:{ maxAge:15, minAge:6, chance:0.2 }, childhood:true, weight:7, cooldown:8,
  text:'The miller’s son is a head taller than anyone his age and has decided you are today’s sport. The lane is blocked, and the other children are watching.',
  options:[
    { label:'Fight him.', chance:0.45, desc:'A bloody nose now, or a toll forever.',
      success:{ text:'You go down twice and get up three times. He blinks first. No one blocks your lane again.', effects:{ prestige:3, skills:{mar:1} } },
      failure:{ text:'You lose, thoroughly. But you got up every time, and everyone saw that too.', effects:{ health:-1, prestige:1 } } },
    { label:'Talk your way past.', chance:0.5, desc:'A sharp tongue may cost less than knuckles.',
      success:{ text:'You make him laugh, and the toll is forgotten.', effects:{ skills:{dip:1} } },
      failure:{ text:'Words fail. Mud is involved.', effects:{ health:-1 } } },
    { label:'Go the long way round.', desc:'Cowardice, some say. Sense, say your bones.', effects:{ } }
  ]},
{ id:'child_page', title:'A Page in the Hall',
  trigger:{ maxAge:15, minAge:6, tierMin:2, chance:0.3 }, childhood:true, weight:8, cooldown:8,
  text:'A child of your standing serves at the high table before ruling from behind it: pouring, carrying, and above all listening.',
  options:[
    { label:'Serve flawlessly.', desc:'Perfect service is its own recommendation.', effects:{ skills:{dip:1}, opinion:{role:'lord', amt:5} } },
    { label:'Listen more than you pour.', chance:0.6, desc:'Great men’s secrets, if the steward looks away.',
      success:{ text:'Great men forget a child has ears. You learn things worth knowing.', effects:{ skills:{int:1} } },
      failure:{ text:'Caught lingering behind the arras. The steward’s cuff rings your ear.', effects:{ health:-1, opinion:{role:'lord', amt:-3} } } }
  ]},
{ id:'child_festival', title:'Festival, Waist-High',
  trigger:{ maxAge:15, minAge:6, seasons:[1], chance:0.3 }, childhood:true, weight:7, cooldown:8,
  text:'Festival day, seen from below: a forest of legs, the smell of honey-cakes, and the children’s footrace at noon.',
  options:[
    { label:'Run the race.', chance:0.5, desc:'Win or lose, the day is sweet.',
      success:{ text:'You cross the line first and are carried about on shoulders.', effects:{ prestige:2, health:1 } },
      failure:{ text:'Third place, a stitch in your side, and a wonderful day anyway.', effects:{ health:1 } } },
    { label:'Charm a honey-cake from the baker.', chance:0.6, desc:'A sweet prize for a sweet tongue — maybe.',
      success:{ text:'Warm, sweet, and free. A skill worth keeping.', effects:{ skills:{dip:1}, health:1 } },
      failure:{ text:'The baker has met children before.', effects:{ } } }
  ]},
{ id:'child_wooden_swords', title:'Wooden Swords',
  trigger:{ maxAge:15, minAge:6, chance:0.25 }, childhood:true, weight:7, cooldown:6,
  text:'The village children divide into two armies with stick-swords and hurdle-shields. Someone must lead the charge.',
  options:[
    { label:'Lead it.', desc:'First to charge is first remembered.', effects:{ skills:{mar:1}, prestige:1 } },
    { label:'Plan the ambush instead.', desc:'Battles are won before the charge.', effects:{ skills:{int:1} } },
    { label:'Guard the baggage (a basket).', desc:'Every army needs someone sensible.', effects:{ } }
  ]},
{ id:'child_winter_tales', title:'Tales by the Fire',
  trigger:{ maxAge:15, minAge:6, seasons:[3], chance:0.3 }, childhood:true, weight:7, cooldown:6,
  text:'Snow seals the doors, and the old ones talk: wars and wonders, debts and dooms, and who really owns the far field.',
  options:[
    { label:'Remember every word.', desc:'Old tales are lessons wearing cloaks.', effects:{ skills:{lea:1} } },
    { label:'Ask about the old wars.', desc:'Yesterday’s battles teach tomorrow’s.', effects:{ skills:{mar:1} } },
    { label:'Fall asleep warm.', desc:'A warm sleep is its own small treasure.', effects:{ health:1 } }
  ]},

{ id:'old_age_reflection', title:'The Long Look Back',
  trigger:{ minAge:55, chance:0.2 }, weight:4, once:true,
  text:'Your hands ache with old labors. Children you knew as babes now have grey in their beards. What remains, when the body fails?',
  options:[
    { label:'My name. My blood. My house.', desc:'Let the line carry what the body cannot.', effects:{ prestige:10 } },
    { label:'My soul, made ready.', desc:'Set your accounts with {god} in order.', effects:{ piety:10 } },
    { label:'Nothing. So enjoy the wine.', require:{ religionGroups:['christian','pagan','jewish'] }, desc:'Eat, drink; the rest is smoke.', effects:{ health:1, piety:-5 } },
    { label:'Nothing. So savor the days that remain.', require:{ religionGroups:['muslim'] }, desc:'Each morning is a gift unearned.', effects:{ health:1, piety:-5 } }
  ]}
);
