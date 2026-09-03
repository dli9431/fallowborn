/* =========================================================================
   Fallowborn — COMMON LIFE EVENTS (all walks of life)
   See docs/MODDING.md for the event schema. Quick key:
   trigger: conditions (tierMin/Max, professions, minAge, seasons[0-3],
            flags/notFlags, married, goldMin, chance, religionGroup...)
   weight:  likelihood vs other eligible events. once:true fires one time.
   cooldown: seasons before it can repeat.
   effects: gold/prestige/piety/health, skills:{mar:1}, addTrait, setFlag,
            opinion:{role,amt}, queue:'next_event_id', profession, tier...
   Text tokens: {name} {spouse} {lord} {priest} {friend} {rival} {suitor} {student}
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
    { label:'Pursue this match.', desc:'Give them your personal attention until their Standing is high enough.', effects:{ custom:'begin_courtship' } },
    { label:'Not this one.', desc:'Not every road to fortune needs taking.', effects:{ clearSuitor:true } }
  ]},
{ id:'proposal_made', title:'The Question Is Asked', charCard:'suitor',
  trigger:{ never:true }, /* fired by the "Propose marriage" action */
  text:'Families gather, terms are weighed — your standing, your prospects, the size of your purse. You ask for the hand of {suitor}.',
  options:[
    { label:'Await the answer.', chance:'proposal', desc:'Your standing and your silver are on the scales now.',
      success:{ text:'It is agreed! Before {holy} and kin, you are wed to {suitor}.', effects:{ marry:true, prestige:15, log:'Married {spouse}.' } },
      failure:{ text:'The family refuses — politely, but firmly. Perhaps with more standing, or more silver…', effects:{ clearFlag:'courting', setFlag:'match_refused', clearSuitor:true, prestige:-5 } } }
  ]},
{ id:'sibling_courtship_approach', title:'A Word That Cannot Be Recalled',
  trigger:{ never:true }, contextValidator:'sibling_courtship_approach_valid',
  text:'Trust, appetite, ambition, and taboo have narrowed to one dangerous question. You can speak to your sibling now, but a refusal will end the matter forever.',
  options:[
    { label:'Speak plainly.', desc:'Their own traits and Standing decide the answer; refusal is permanent.', effects:{ custom:'sibling_courtship_approach' } },
    { label:'Keep silence.', desc:'Withdraw before the question is asked; the day is still spent.', effects:{} }
  ]},
{ id:'sibling_courtship_exposed', title:'The Household Whispers',
  trigger:{ never:true }, contextValidator:'sibling_exposure_context_valid',
  text:'A servant saw a hand linger; a cousin heard a door close. What passed for private devotion is becoming a public scandal.',
  options:[
    { label:'End it before worse follows.', desc:'Break off the courtship and accept the lasting five-year separation.', effects:{ custom:'sibling_exposure_end', piety:-5 } },
    { label:'Deny everything.', desc:'Intrigue may quiet the story; discovery will deepen the scandal.', chance:'sibling_exposure_denial',
      success:{ text:'Contradictory stories and careful pressure leave the gossips uncertain.', effects:{ prestige:-5, piety:-5 } },
      failure:{ text:'The denial collapses. Now the secret and the lie are both common knowledge.', effects:{ prestige:-20, piety:-20, popularOpinion:-10, opinionLiege:-15 } } },
    { label:'Persist openly.', desc:'Keep the courtship and bear the immediate public cost.', effects:{ prestige:-15, piety:-20, popularOpinion:-8, opinionLiege:-10 } }
  ]},
{ id:'sibling_proposal_made', title:'Vows Against the World', charCard:'suitor',
  trigger:{ never:true }, contextValidator:'sibling_proposal_context_valid',
  text:'The courtship has survived its first impossible question. You ask {suitor} for vows that may be sanctified by a rare rite — or condemned as an irregular union.',
  options:[
    { label:'Ask for the vows.', desc:'Standing and their traits decide the answer. The reviewed rite or scandal costs apply only if they accept.', chance:'sibling_proposal',
      success:{ text:'{suitor} accepts. Whatever the world calls it, the two of you will make a household.', effects:{ custom:'sibling_marriage_success' } },
      failure:{ text:'At the final threshold, {suitor} refuses. The courtship is over and will never be renewed.', effects:{ custom:'sibling_proposal_refused' } } }
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
    { label:'Oblige them handsomely.', require:{ goldMin:6 }, desc:'A favor bought now is peace kept at the high table.', effects:{ gold:-6, prestige:4, opinion:{role:'spouse', amt:8}, traitProgress:{id:'hearth_steady'} } },
    { label:'You wed {spouse}, not the whole house.', desc:'Stand your ground, and let the marriage weather it.', effects:{ opinion:{role:'spouse', amt:-8}, prestige:1 } }
  ]},
{ id:'wed_below', title:'Tongues Wag',
  trigger:{ married:true, maxSeasonsSinceMarriage:4, custom:'wed_below_station', chance:0.6 }, weight:16, cooldown:40,
  text:'At the well and in the hall they whisper it: you married beneath yourself. {spouse} pretends not to hear.',
  options:[
    { label:'Let them talk. You chose well.', desc:'Gossip fades; a good marriage does not.', effects:{ opinion:{role:'spouse', amt:10}, prestige:-3, traitProgress:{id:'hearth_steady'} } },
    { label:'Grease the loudest tongues.', require:{ goldMin:5 }, desc:'A little silver buys a little silence.', effects:{ gold:-5 } }
  ]},
{ id:'wedding_gift', title:'A Wedding Gift',
  trigger:{ married:true, chance:0.5, maxSeasonsSinceMarriage:2 }, once:true, weight:20,
  text:{ default:'Well-wishers bring gifts to the new couple — a pig, a bolt of cloth, a few coins pressed into your palm.',
    muslim:'Well-wishers bring gifts to the new couple — a lamb, a bolt of cloth, a few coins pressed into your palm.',
    jewish:'Well-wishers bring gifts to the new couple — a lamb, a bolt of cloth, a few coins pressed into your palm.' },
  options:[ { label:'Fortune smiles.', desc:'Begin the marriage as you mean to go on.', effects:{ gold:8, opinion:{role:'spouse', amt:10}, traitProgress:{id:'hearth_steady'} } } ]},

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
    { label:'Press the plea.', desc:'{money:marriageGold} and {marriagePiety} piety ride on the church’s judgment.',
      require:{ marriageEndReady:true }, chance:'annulment',
      success:{ text:'The judgment comes down: null and void from the first day. {spouse} returns to their kin, and you stand free before {god}.',
        effects:{ marriageEnd:'success', custom:'annul_granted', log:'The church annulled the marriage.' } },
      failure:{ text:'The church finds the marriage sound — and your motives less so. The plea is refused; the donation is kept, and {spouse} learns what you tried.',
        effects:{ marriageEnd:'failure', popularOpinion:-5, opinion:{role:'spouse', amt:-30} } } },
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
    { label:'Pay for a physician.', require:{ goldMin:10 }, desc:'Silver for a trained leech and his strong medicines.', chance:0.75,
      success:{ text:'The fever breaks. The child will live.', effects:{ gold:-10, traitProgress:{id:'hearth_steady'} } },
      failure:{ text:'Coin could not buy what {god} would not give. The child is gone.', effects:{ gold:-10, killChild:true, health:-1 } } },
    { label:'Pray through the night.', chance:0.55, desc:'Put the child in {god}’s hands and keep vigil.',
      success:{ text:'By dawn the fever breaks. A small miracle.', effects:{ piety:8, traitProgress:{id:'hearth_steady'} } },
      failure:{ text:'By dawn the little body is still. You dig a small grave.', effects:{ piety:3, killChild:true, health:-1 } } },
    { label:'Call the wise woman.', require:{ goldMin:3 }, desc:'A few coins for herbs, charms, and a cool cloth.', chance:0.6,
      success:{ text:'Her simples do their work. The fever breaks; the child will live.', effects:{ gold:-3, traitProgress:{id:'hearth_steady'} } },
      failure:{ text:'Herbs and charms were not enough. The child is gone.', effects:{ gold:-3, killChild:true, health:-1 } } },
    { label:'Summon a renowned physician.', require:{ goldMin:30 }, desc:'The finest leechcraft in the land, at a lordly price.', chance:0.9,
      success:{ text:'The great physician doses, bleeds, and waits — and the fever breaks. The child will live.', effects:{ gold:-30, traitProgress:{id:'hearth_steady'} } },
      failure:{ text:'Even the great physician bows his head. The child is gone.', effects:{ gold:-30, killChild:true, health:-1 } } }
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
    { label:'Now their true education begins.', desc:'Life teaches what no schoolmaster can.', effects:{ } }
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
  text:'You turn sixteen. The years of lessons are over — whatever your teachers drilled into you, for good or ill, is yours to carry now.',
  options:[
    { label:'I will do the family proud.', desc:'The lessons are yours to spend now.', effects:{ prestige:5 } },
    { label:'Now my true education begins.', desc:'The world is the last and hardest tutor.', effects:{ } }
  ]},

/* ---------- Noble Academy ---------- */
{ id:'academy_patron_notice', title:'A Patron’s Notice', trigger:{ never:true },
  contextValidator:'education_story_context_valid',
  text:'At the Noble Academy, {student} catches the notice of a patron whose table gathers ambitious heirs and useful names. An introduction could open a door, but patrons admire silver almost as much as promise.',
  options:[
    { label:'Secure the introduction with a gift. ({money:8})',
      require:{ goldMin:8 },
      desc:'The patron will remember both the student and the household’s generosity.',
      effects:{ gold:-8, prestige:4, custom:'academy_introduction',
        log:'Secured an academy patron’s introduction for {student}.' } },
    { label:'Let merit make the introduction.', chance:0.55,
      desc:'Talent may speak loudly enough without coin.',
      success:{ text:'The patron asks {student} to remain after the lecture. Merit has opened the door.',
        effects:{ custom:'academy_introduction',
          log:'Won an academy patron’s notice through {student}’s merit.' } },
      failure:{ text:'The patron praises the exercise, then turns to an heir whose family name needs no introduction.',
        effects:{ log:'Trusted {student}’s merit at the academy, but no patron came forward.' } } },
    { label:'Remain at study.', desc:'A lesson mastered is worth more than a favor chased.',
      effects:{ custom:'academy_student_focus',
        log:'Kept {student} at their academy studies.' } }
  ]},

{ id:'academy_purse', title:'The Academy Purse', trigger:{ never:true },
  contextValidator:'education_story_context_valid',
  text:'The Noble Academy names the books, instruments, and formal dress expected for the coming term. {student} can continue without them, but every better-equipped rival will notice.',
  options:[
    { label:'Provide everything requested. ({money:10})',
      require:{ goldMin:10 },
      desc:'Fine tools and books make a visible investment in the student.',
      effects:{ gold:-10, prestige:5, custom:'academy_student_focus',
        log:'Equipped {student} handsomely for the academy.' } },
    { label:'Make do with what the household has.',
      desc:'Careful accounts can stretch a thin purse, though appearances suffer.',
      effects:{ prestige:-2, custom:'academy_student_ste',
        log:'Sent {student} back to the academy with a carefully managed purse.' } },
    { label:'Withdraw from the academy.',
      desc:'End the expense and continue the child’s instruction elsewhere.',
      effects:{ custom:'academy_withdraw',
        log:'Withdrew {student} from the Noble Academy.' } }
  ]},

{ id:'academy_disputation', title:'The Great Disputation', trigger:{ never:true },
  contextValidator:'education_story_context_valid',
  text:'The academy hall fills for a public disputation. {student} must choose whether to win the judges through graceful argument, expose an opponent’s hidden weakness, or ground every claim in learned authority.',
  options:[
    { label:'Win the room with graceful argument.',
      desc:'A polished answer can carry both judgment and audience.',
      effects:{ prestige:2, custom:'academy_student_dip',
        log:'{student} distinguished the household in the academy disputation.' } },
    { label:'Find the weakness no one else sees.',
      desc:'A quiet observation can undo the loudest rival.',
      effects:{ prestige:1, custom:'academy_student_int',
        log:'{student} unmade a rival’s case in the academy disputation.' } },
    { label:'Answer from law, scripture, and authority.',
      desc:'Let close study give the argument its foundation.',
      effects:{ piety:2, custom:'academy_student_lea',
        log:'{student} answered the academy disputation with learned authority.' } }
  ]},

{ id:'academy_houses_compete', title:'Houses in Competition', trigger:{ never:true },
  contextValidator:'education_story_context_valid',
  text:'Two great houses turn an academy exercise into a contest of precedence. {student} is asked to help arrange the household, observe the maneuvering, or represent the family before the assembled patrons.',
  options:[
    { label:'Set the competing households in order.',
      desc:'Servants, stores, and schedules decide whether grandeur holds together.',
      effects:{ prestige:2, custom:'academy_student_ste',
        log:'{student} managed the household contest at the Noble Academy.' } },
    { label:'Watch the politics behind the contest.',
      desc:'The true lesson lies in who yields, who whispers, and who profits.',
      effects:{ prestige:1, custom:'academy_student_int',
        log:'{student} studied the politics behind the academy’s rival houses.' } },
    { label:'Represent the household before the patrons.',
      desc:'Courtesy and confidence can turn a school exercise into reputation.',
      effects:{ prestige:3, custom:'academy_student_dip',
        log:'{student} represented the household before the academy’s patrons.' } }
  ]},

/* ---------- formative education ---------- */
{ id:'education_diplomacy_audience', title:'A Difficult Audience',
  trigger:{ never:true },
  educationStory:true, educationFocuses:['dip'],
  text:'During a lesson before the household, {student} is pressed to answer a needling question without preparation. You can teach them to wait for the room, or to trust their own importance.',
  options:[
    { label:'Teach patience before speaking.', chance:0.65,
      desc:'Success may make {student} Patient and improve Diplomacy; failure costs 1 Diplomacy.',
      success:{ text:'{student} lets the silence settle, then answers with care.', effects:{ student:{ skills:{dip:1}, addTrait:'patient' } } },
      failure:{ text:'The pause becomes uncertainty, and the room slips away.', effects:{ student:{ skills:{dip:-1} } } } },
    { label:'Teach them to command the room.', chance:0.65,
      desc:'Success may make {student} Proud and improve Diplomacy; failure costs 1 Diplomacy.',
      success:{ text:'{student} answers as though every listener had been waiting for precisely those words.', effects:{ student:{ skills:{dip:1}, addTrait:'proud' } } },
      failure:{ text:'Confidence outruns judgment, and the answer draws quiet smiles.', effects:{ student:{ skills:{dip:-1} } } } }
  ]},

{ id:'education_martial_yard', title:'The Blunted Blade',
  trigger:{ never:true },
  educationStory:true, educationFocuses:['mar'],
  text:'A blunted practice blade is knocked from {student}’s hand. The other pupils watch to see whether they will step forward again or lash out at the insult.',
  options:[
    { label:'Step back into the bout.', chance:0.65,
      desc:'Success may make {student} Brave and improve Martial; failure costs 1 Martial.',
      success:{ text:'{student} retrieves the blade and meets the next blow without flinching.', effects:{ student:{ skills:{mar:1}, addTrait:'brave' } } },
      failure:{ text:'Resolve fails at the first hard clash.', effects:{ student:{ skills:{mar:-1} } } } },
    { label:'Turn the sting into fury.', chance:0.65,
      desc:'Success may make {student} Wrathful and improve Martial; failure costs 1 Martial.',
      success:{ text:'Anger lends {student} speed and force enough to seize the yard.', effects:{ student:{ skills:{mar:1}, addTrait:'wrathful' } } },
      failure:{ text:'The anger breaks their form and leaves them open.', effects:{ student:{ skills:{mar:-1} } } } }
  ]},

{ id:'education_stewardship_tally', title:'The Crooked Tally',
  trigger:{ never:true },
  educationStory:true, educationFocuses:['ste'],
  text:'While checking a practice account, {student} finds a small error that favors the household. No one else appears to have noticed.',
  options:[
    { label:'Correct the tally openly.', chance:0.65,
      desc:'Success may make {student} Honest and improve Stewardship; failure costs 1 Stewardship.',
      success:{ text:'{student} names the error and balances the account cleanly.', effects:{ student:{ skills:{ste:1}, addTrait:'honest' } } },
      failure:{ text:'The correction tangles the whole account and confidence falters.', effects:{ student:{ skills:{ste:-1} } } } },
    { label:'Teach them to keep every advantage.', chance:0.65,
      desc:'Success may make {student} Greedy and improve Stewardship; failure costs 1 Stewardship.',
      success:{ text:'{student} learns exactly where a quiet advantage can hide in a ledger.', effects:{ student:{ skills:{ste:1}, addTrait:'greedy' } } },
      failure:{ text:'The false balance is discovered before the lesson is done.', effects:{ student:{ skills:{ste:-1} } } } }
  ]},

{ id:'education_intrigue_secret', title:'A Secret in the Passage',
  trigger:{ never:true },
  educationStory:true, educationFocuses:['int'],
  text:'{student} overhears a confidence never meant for young ears. The lesson now is what to do with knowledge that another person believes hidden.',
  options:[
    { label:'Fashion a useful falsehood around it.', chance:0.65,
      desc:'Success may make {student} Deceitful and improve Intrigue; failure costs 1 Intrigue.',
      success:{ text:'{student} conceals the truth inside a story no one thinks to question.', effects:{ student:{ skills:{int:1}, addTrait:'deceitful' } } },
      failure:{ text:'The invented story exposes more than silence would have done.', effects:{ student:{ skills:{int:-1} } } } },
    { label:'Question why any confidence deserves faith.', chance:0.65,
      desc:'Success may make {student} Cynical and improve Intrigue; failure costs 1 Intrigue.',
      success:{ text:'{student} learns to look for the purpose behind every trusted word.', effects:{ student:{ skills:{int:1}, addTrait:'cynical' } } },
      failure:{ text:'Suspicion without judgment leaves every motive equally obscure.', effects:{ student:{ skills:{int:-1} } } } }
  ]},

{ id:'education_learning_gloss', title:'The Troubling Gloss',
  trigger:{ never:true },
  educationStory:true, educationFocuses:['lea'],
  text:'A disputed gloss in {student}’s lesson can be defended as sacred wisdom or studied slowly beside rival authorities.',
  options:[
    { label:'Defend the received teaching.', chance:0.65,
      desc:'Success may make {student} Zealous and improve Learning; failure costs 1 Learning.',
      success:{ text:'{student} gives the old teaching a fervent and learned defense.', effects:{ student:{ skills:{lea:1}, addTrait:'zealous' } } },
      failure:{ text:'Fervor supplies certainty but not an answer.', effects:{ student:{ skills:{lea:-1} } } } },
    { label:'Compare every authority with patience.', chance:0.65,
      desc:'Success may make {student} Patient and improve Learning; failure costs 1 Learning.',
      success:{ text:'{student} works through each contradiction until a careful answer emerges.', effects:{ student:{ skills:{lea:1}, addTrait:'patient' } } },
      failure:{ text:'The competing authorities leave the lesson more tangled than before.', effects:{ student:{ skills:{lea:-1} } } } }
  ]},

{ id:'education_found_purse', title:'The Found Purse',
  trigger:{ never:true },
  educationStory:true,
  text:'{student} finds a small purse beneath a bench after lessons. Its owner is unknown, and the household will judge what the child does next.',
  options:[
    { label:'Announce the find and seek its owner.', chance:0.65,
      desc:'Success may make {student} Honest and improve Stewardship; failure costs 1 Stewardship.',
      success:{ text:'{student} returns the purse without taking so much as a clipped coin.', effects:{ student:{ skills:{ste:1}, addTrait:'honest' } } },
      failure:{ text:'The search becomes a muddle of claims and poor accounting.', effects:{ student:{ skills:{ste:-1} } } } },
    { label:'Hide the purse and deny seeing it.', chance:0.65,
      desc:'Success may make {student} Deceitful and improve Intrigue; failure costs 1 Intrigue.',
      success:{ text:'{student} keeps both purse and secret beyond suspicion.', effects:{ student:{ skills:{int:1}, addTrait:'deceitful' } } },
      failure:{ text:'A clumsy denial makes the truth plain to everyone.', effects:{ student:{ skills:{int:-1} } } } },
    { label:'Give the coins where they are needed.', chance:0.65,
      desc:'Success may make {student} Generous and improve Diplomacy; failure costs 1 Diplomacy.',
      success:{ text:'{student} turns a stranger’s loss into several remembered kindnesses.', effects:{ student:{ skills:{dip:1}, addTrait:'generous' } } },
      failure:{ text:'Good intent cannot mend the quarrel over money given away.', effects:{ student:{ skills:{dip:-1} } } } }
  ]},

{ id:'education_younger_pupil', title:'The Younger Pupil',
  trigger:{ never:true },
  educationStory:true,
  text:'A younger pupil repeatedly fails a lesson that {student} has already mastered. The child waits for help; the others wait for amusement.',
  options:[
    { label:'Teach with kindness.', chance:0.65,
      desc:'Success may make {student} Kind and improve Diplomacy; failure costs 1 Diplomacy.',
      success:{ text:'{student} finds patient words that make the lesson clear.', effects:{ student:{ skills:{dip:1}, addTrait:'kind' } } },
      failure:{ text:'The explanation only confuses and embarrasses both pupils.', effects:{ student:{ skills:{dip:-1} } } } },
    { label:'Make an example of weakness.', chance:0.65,
      desc:'Success may make {student} Cruel and improve Intrigue; failure costs 1 Intrigue.',
      success:{ text:'{student} learns how quickly fear can command a room.', effects:{ student:{ skills:{int:1}, addTrait:'cruel' } } },
      failure:{ text:'The mockery turns the other pupils against its author.', effects:{ student:{ skills:{int:-1} } } } }
  ]},

{ id:'education_public_praise', title:'Praise Before the Household',
  trigger:{ never:true },
  educationStory:true,
  text:'A tutor praises {student} before the whole household. Every eye turns toward the child as they decide how to receive the honor.',
  options:[
    { label:'Share the credit with others.', chance:0.65,
      desc:'Success may make {student} Humble and improve Diplomacy; failure costs 1 Diplomacy.',
      success:{ text:'{student} names every hand that helped and wins warmer praise.', effects:{ student:{ skills:{dip:1}, addTrait:'humble' } } },
      failure:{ text:'The words sound rehearsed, and the moment passes awkwardly.', effects:{ student:{ skills:{dip:-1} } } } },
    { label:'Teach them to own the achievement.', chance:0.65,
      desc:'Success may make {student} Proud and improve Diplomacy; failure costs 1 Diplomacy.',
      success:{ text:'{student} accepts the praise with the confidence of one who expects more.', effects:{ student:{ skills:{dip:1}, addTrait:'proud' } } },
      failure:{ text:'Boasting turns admiration into resentment.', effects:{ student:{ skills:{dip:-1} } } } }
  ]},

{ id:'education_lesson_feast', title:'The Lesson-Day Feast',
  trigger:{ never:true },
  educationStory:true,
  text:'A feast marks the end of a hard lesson day. {student} can keep a measured place at the table or discover just how much pleasure appetite can hold.',
  options:[
    { label:'Practice restraint at the table.', chance:0.65,
      desc:'Success may make {student} Temperate and improve Stewardship; failure costs 1 Stewardship.',
      success:{ text:'{student} enjoys the feast without surrendering judgment to it.', effects:{ student:{ skills:{ste:1}, addTrait:'temperate' } } },
      failure:{ text:'Restraint becomes distraction, and every small duty is forgotten.', effects:{ student:{ skills:{ste:-1} } } } },
    { label:'Let appetite have its holiday.', chance:0.65,
      desc:'Success may make {student} Gluttonous and improve Stewardship; failure costs 1 Stewardship.',
      success:{ text:'{student} learns every trick for claiming the richest share.', effects:{ student:{ skills:{ste:1}, addTrait:'gluttonous' } } },
      failure:{ text:'Excess ends in sickness and a lesson poorly remembered.', effects:{ student:{ skills:{ste:-1} } } } }
  ]},

{ id:'education_future_ambitions', title:'A Future Imagined',
  trigger:{ never:true },
  educationStory:true,
  text:'Asked what adulthood should bring, {student} describes a future either larger than the household can yet promise or comfortably rooted in what it already holds.',
  options:[
    { label:'Encourage the highest ambition.', chance:0.65,
      desc:'Success may make {student} Ambitious and improve Diplomacy; failure costs 1 Diplomacy.',
      success:{ text:'{student} begins to speak of rank and achievement as things meant to be won.', effects:{ student:{ skills:{dip:1}, addTrait:'ambitious' } } },
      failure:{ text:'The great future remains a boast without any plan behind it.', effects:{ student:{ skills:{dip:-1} } } } },
    { label:'Teach contentment with a sound life.', chance:0.65,
      desc:'Success may make {student} Content and improve Stewardship; failure costs 1 Stewardship.',
      success:{ text:'{student} learns to see security and sufficiency as achievements of their own.', effects:{ student:{ skills:{ste:1}, addTrait:'content' } } },
      failure:{ text:'Contentment is mistaken for indifference, and the lesson loses purpose.', effects:{ student:{ skills:{ste:-1} } } } }
  ]},

/* ---------- leaving a former station ---------- */
{ id:'station_farewell', title:'Never Again', trigger:{ never:true }, once:true,
  text:{ forms:{ select:'value', param:'formerProfession', cases:{
    farmer:'The soil still lies beneath your nails when petitioners first call you “my lord.” Fields that once commanded every daylight hour are now worked at your order. You may remember that life, but you will never return to it unchanged.',
    craftsman:'Your hands remember the weight of tools even as clerks place seals and tallies before them. The old bench made you; title has carried you beyond it.',
    merchant:'You still reckon a bargain at a glance, but factors now cross the market in your name. The road and stall belong to an earlier life.',
    soldier:'Your body remembers the sergeant’s stick and the cold watch. Now other soldiers wait upon your command, and the common rank is closed behind you.',
    monk:'The hours of ink, prayer, and common service formed you. Office and land now ask another kind of duty, however plain the old habit once felt.',
    priest:'You once served one altar and the souls gathered before it. Rank and land have widened that charge beyond any parish door.',
    noble:'You were trained for hall and saddle; now the hall is yours to answer for. Service has become rule.',
    other:'The work that carried you this far belongs to an earlier station. Its lessons remain, though its daily burdens have passed to other hands.'
  }}},
  options:[
    { label:'Honor the life that made you.', desc:'Keep faith with your roots, though the great call it sentiment.',
      effects:{ popularOpinion:10, prestige:-5, log:'Honored the life lived before taking up rule.' } },
    { label:'Put the old life away.', desc:'A ruler cannot forever look backward.',
      effects:{ prestige:10, popularOpinion:-8, log:'Renounced the old station and embraced rule.' } }
  ]},

/* ---------- health ---------- */
{ id:'winter_fever', title:'The Coughing Sickness',
  trigger:{ seasons:[3], chance:0.16, notFlags:['ill'] }, childhood:true, weight:10, cooldown:8,
  text:{ forms:{ select:'value', param:'societalRole', cases:{
    serf:'A wet cough settles in your chest as the cold bites. Half the village is abed with it.',
    commoner:'A wet cough settles in your chest as the cold bites. Half the street is abed with it.',
    gentry:'A wet cough settles in your chest as the cold bites. Servants carry the same sickness from room to room.',
    lord:'A wet cough settles in your chest as the cold bites. The hall grows quiet as servants and petitioners fall ill.',
    crowned:'A wet cough settles in your chest as the cold bites. Even guarded royal chambers cannot bar a winter sickness.',
    other:'A wet cough settles in your chest as the cold bites. The household is full of the same sickness.'
  }}},
  options:[
    { label:'Rest and broth.', desc:'Give the sickness a warm bed and time.', effects:{ health:-1, setFlag:'ill', log:'Took ill over winter.' } },
    { label:'Work through it.', require:{ societalRoles:['serf','commoner','gentry'] },
      chance:0.5, desc:'Sweat it out — or let it dig its claws in.',
      success:{ text:'You sweat it out at your labors.', effects:{ } },
      failure:{ text:'You collapse. The sickness digs deep.', effects:{ health:-2, setFlag:'ill' } } },
    { label:'Keep council from your sickbed.', require:{ societalRoles:['lord','crowned'] },
      desc:'Rule cannot pause for a cough.', effects:{ health:-2, prestige:3, setFlag:'ill' } }
  ]},
{ id:'recovery', title:'On the Mend',
  trigger:{ flags:['ill'], chance:0.6 }, wartime:true, childhood:true, weight:30,
  text:'Strength returns to your limbs at last. The sickness has run its course.',
  options:[ { label:'Back to life.', desc:'The world kept turning without you.', effects:{ clearFlag:'ill', health:1 } } ]},
{ id:'bad_tooth', title:'A Rotten Tooth',
  trigger:{ minAge:25, chance:0.1 }, weight:4, cooldown:20,
  text:{ forms:{ select:'value', param:'societalRole', cases:{
    serf:'A tooth throbs like a war-drum. The smith owns the only pliers in the village.',
    commoner:'A tooth throbs like a war-drum. A barber in town claims a steady hand with the pliers.',
    gentry:'A tooth throbs like a war-drum. The household sends for a barber who has pulled worse.',
    lord:'A tooth throbs like a war-drum. Your physician recommends the old, swift remedy.',
    crowned:'A tooth throbs like a war-drum. The royal physician arrives with silver instruments and grave confidence.',
    other:'A tooth throbs like a war-drum. Someone nearby owns pliers and confidence.'
  }}},
  options:[
    { label:'Have it pulled.', require:{ societalRoles:['serf','commoner','gentry'] },
      desc:'Short pain, then peace — for a coin.', effects:{ health:-1, gold:-1, log:'Had the rotten tooth pulled.' } },
    { label:'Endure it.', desc:'Pain dulls with time. So they say.', effects:{ health:-1 } },
    { label:'Trust the court physician. ({money:5})',
      require:{ societalRoles:['lord','crowned'], goldMin:5 },
      desc:'Better instruments, the same moment of terror.',
      effects:{ gold:-5, log:'Had the rotten tooth treated by a physician.' } }
  ]},

/* ---------- faith ---------- */
{ id:'sermon', title:'Words That Linger',
  trigger:{ chance:0.2, religionGroup:'christian' }, weight:4, cooldown:12,
  text:'{priest} preaches with unusual fire — of the rich man, the camel, and the needle’s eye.',
  options:[
    { label:'Take it to heart.', desc:'Good words, freely given, freely kept.', effects:{ piety:5, opinion:{role:'priest', amt:5} } },
    { label:'Let the words pass unheard.', desc:'The sermon will keep; your attention does not.', effects:{ opinion:{role:'priest', amt:-5} } }
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
    { label:'The {holy} speaks well of you to the lord. (35 piety)',
      require:{ pietyMin:35, societalRoles:['serf','commoner','gentry'] },
      desc:'A good word from the pulpit weighs with the great.',
      effects:{ piety:-35, opinion:{role:'lord', amt:15}, log:'The clergy praised your name at the manor.' } },
    { label:'Masses sung for your ancestors. (25 piety)', require:{ pietyMin:25 },
      desc:'The dead are honored, and the living speak of it.',
      effects:{ piety:-25, prestige:8, popularOpinion:4, log:'Masses were sung for the family dead.' } },
    { label:'A blessing upon your house. (30 piety)', require:{ pietyMin:30, married:true },
      desc:'Grace settles over hearth and home.',
      effects:{ piety:-30, opinion:{ role:'spouse', amt:20 }, log:'The house was blessed.' } },
    { label:'Only quiet prayer.', desc:'Ask nothing, want nothing.', effects:{ piety:2 } },
    { label:'Praise before your liege. (35 piety)',
      require:{ pietyMin:35, societalRoles:['lord','crowned'], isVassal:true },
      desc:'The clergy’s public favor strengthens your standing at court.',
      effects:{ piety:-35, opinionLiege:15, prestige:4, log:'The clergy praised your rule before the liege.' } },
    { label:'Prayers for the realm. (35 piety)',
      require:{ pietyMin:35, societalRoles:['lord','crowned'], isVassal:false },
      desc:'Let every pulpit commend peace beneath your rule.',
      effects:{ piety:-35, prestige:8, popularOpinion:6, log:'The clergy offered public prayers for the realm.' } }
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
  trigger:{ chance:0.15, noRole:'friend', custom:'friendship_kindled_ready' }, weight:6,
  text:'Long hours shared with {friend} — conversation, favors, and private jokes — have become a friendship neither of you needs to name.',
  options:[ { label:'A friend is rare wealth.', desc:'Hold fast; such luck does not come twice.', effects:{ custom:'formalize_attention_friend' } } ]},
{ id:'make_rival', title:'Bad Blood',
  trigger:{ never:true },
  text:'The old injury has found a name. Before neighbors and kin, {rival} declares that no friendship stands between your houses and that every slight will be answered.',
  options:[
    { label:'Offer amends before witnesses. ({money:5})', require:{ goldMin:5 },
      desc:'Acknowledge the injury and put silver behind the apology.',
      effects:{ gold:-5, opinion:{role:'rival', amt:20}, rivalHeat:-20 } },
    { label:'Call for a mediator.', desc:'Neither pride nor anger gets the final word.',
      effects:{ rivalHeat:-5, queue:'rival_mediation' } },
    { label:'Answer enmity with defiance.', desc:'Let every witness know that you will give as good as you get.',
      effects:{ opinion:{role:'rival', amt:-10}, rivalHeat:15, prestige:3 } } ]},
{ id:'rival_scheme', title:'Poisoned Words',
  trigger:{ chance:0.2, hasRole:'rival', roleOpinionBelow:{role:'rival', value:-30} }, weight:6, cooldown:10,
  text:{ forms:{ select:'value', param:'societalRole', cases:{
    serf:'{rival} has been spreading poison about you through the village — theft, blasphemy, worse. People look at you differently now.',
    commoner:'{rival} has been spreading poison about you through market and street — theft, blasphemy, worse.',
    gentry:'{rival} has carried old accusations from manor to manor. Invitations cool and neighbors look twice.',
    lord:'{rival} whispers against you in other halls, turning every judgment into evidence of tyranny or weakness.',
    crowned:'{rival} has seeded the court with accusations fit for a crown: impiety, illegitimacy, and secret betrayal.',
    other:'{rival} has been spreading poison about you, and people look at you differently now.'
  }}},
  options:[
    { label:'Confront them before witnesses.', chance:0.6, desc:'Drag the poison into daylight and dare them to repeat it.',
      success:{ text:'They stammer and withdraw the words. The witnesses laugh at them.', effects:{ prestige:8, opinion:{role:'rival', amt:-10}, rivalHeat:8 } },
      failure:{ text:'They double down, and the crowd murmurs against you.', effects:{ prestige:-8, rivalHeat:10 } } },
    { label:'Let the lie die on its own.', desc:'Lies starve slower than truth feeds.', effects:{ prestige:-4, rivalHeat:-8 } },
    { label:'Repay them in kind.', desc:'Poison for poison, and yours brewed better.', effects:{ opinion:{role:'rival', amt:-15}, rivalHeat:15, skills:{int:1} } }
  ]},
{ id:'rival_mediation', title:'The Go-Between', trigger:{ never:true },
  text:{ default:'A respected go-between seats you and {rival} beneath the same roof. The terms are old and plain: amends for the injury, witnesses to the promise, and an end to every private revenge.',
    muslim:'A respected go-between seats you and {rival} beneath the same roof and urges ṣulḥ: fair amends, named witnesses, and a binding end to the quarrel.',
    pagan:'An elder seats you and {rival} before the assembly. The terms are old and plain: compensation for the injury, hands clasped before witnesses, and no private revenge.',
    jewish:'A respected elder seats you and {rival} before witnesses. The terms are plain: restitution for the injury and a sworn end to the quarrel.' },
  options:[
    { label:'Offer fair amends. ({money:10})', require:{ goldMin:10 },
      desc:'Silver admits that an injury was done without making you crawl.', chance:'rival_peace',
      effects:{ gold:-10, opinion:{role:'rival', amt:15}, rivalHeat:-15 },
      success:{ text:'The purse changes hands. Your enemy names the injury answered, and the witnesses bind you both to peace.',
        effects:{ endRivalry:true, prestige:3, log:'Made peace with a rival through compensation.' } },
      failure:{ text:'{rival} pushes the purse back. “Silver cannot buy what was taken.” The go-between has no peace to witness.',
        effects:{ rivalHeat:5, prestige:-2 } } },
    { label:'Ask judgment of the mediator.', require:{ pietyMin:5 },
      desc:'Put pride aside and accept an outsider’s terms.', chance:'rival_peace',
      effects:{ piety:-5, rivalHeat:-10 },
      success:{ text:'The judgment leaves neither side wholly pleased, which is how the witnesses know it is fair. Both sides swear to let the matter rest.',
        effects:{ opinion:{role:'rival', amt:20}, endRivalry:true, piety:5, log:'Accepted a mediated peace with a rival.' } },
      failure:{ text:'Every term becomes another argument. At last the mediator rises and leaves you to your anger.',
        effects:{ rivalHeat:8 } } },
    { label:'Demand that they pay you.', desc:'Peace is welcome, but not at the price of surrendering your claim.', chance:0.4,
      success:{ text:'Rather than feed the feud another year, your enemy pays a smaller purse and names the matter closed.',
        effects:{ gold:5, prestige:3, opinion:{role:'rival', amt:10}, endRivalry:true, log:'Took compensation to end a rivalry.' } },
      failure:{ text:'{rival} laughs at the demand. The mediator’s table has merely given the quarrel a new insult.',
        effects:{ rivalHeat:12, opinion:{role:'rival', amt:-5} } } },
    { label:'There will be no bargain.', desc:'Leave with every grievance intact.', effects:{ rivalHeat:8 } }
  ]},
{ id:'rival_peace_oath', title:'Peace Before Witnesses',
  trigger:{ hasRole:'rival', rivalHeatMax:25, roleOpinionAbove:{role:'rival', value:-35}, chance:0.25 },
  weight:7, cooldown:16,
  text:{ default:'{rival} comes with witnesses and a careful proposal: speak the injuries aloud, renounce revenge, and seal the peace before the altar with an oath and the kiss of peace.',
    muslim:'{rival} comes with witnesses and a careful proposal of ṣulḥ: speak the claims plainly, settle them fairly, and swear before {god} that the quarrel is ended.',
    pagan:'{rival} comes before the assembly with a careful proposal: speak the injuries aloud, renounce revenge, and clasp hands over an oath of peace.',
    jewish:'{rival} comes with elders and a careful proposal: speak the injuries plainly, make restitution where it is owed, and swear before witnesses that the quarrel is ended.' },
  options:[
    { label:'Swear the peace.', desc:'A public oath closes doors that private anger keeps opening.',
      effects:{ opinion:{role:'rival', amt:15}, endRivalry:true, piety:5, prestige:3, log:'Swore a public peace with a rival.' } },
    { label:'Ask one token of good faith.', desc:'Let a small concession prove that the words have weight.', chance:'rival_peace',
      success:{ text:'The token is yielded without haggling. The witnesses murmur approval, and the oath is made.',
        effects:{ gold:3, opinion:{role:'rival', amt:10}, endRivalry:true, prestige:4 } },
      failure:{ text:'The token becomes a price, the price an insult. The witnesses go home without hearing an oath.',
        effects:{ rivalHeat:10 } } },
    { label:'Refuse their hand.', desc:'Some injuries deserve a longer memory.', effects:{ opinion:{role:'rival', amt:-10}, rivalHeat:20, prestige:2 } }
  ]},
{ id:'rival_common_cause', title:'Under One Roof',
  trigger:{ societalRoles:['serf','commoner','gentry'], hasRole:'rival', rivalHeatMin:20, rivalHeatMax:69, chance:0.12 }, weight:5, cooldown:14,
  text:'Fire takes a neighbor’s roof in a hard wind. You and {rival} arrive from opposite lanes, each with people and ladders, and find yourselves holding the same sagging beam while sparks fall around you.',
  options:[
    { label:'Work beside them until the fire is beaten.', desc:'Shared labor may do what argument could not.', chance:'skill_dip',
      success:{ text:'At dawn the house still stands. {rival} meets your eye across the smoking yard and, for once, nods without mockery.',
        effects:{ opinion:{role:'rival', amt:20}, rivalHeat:-25, prestige:4 } },
      failure:{ text:'Every shouted order becomes an argument. The roof is saved, but neither of you credits the other.',
        effects:{ rivalHeat:-5 } } },
    { label:'Save your own people and leave theirs struggling.', desc:'The feud has already taught you where mercy leads.',
      effects:{ prestige:-3, opinion:{role:'rival', amt:-10}, rivalHeat:15 } },
    { label:'Propose peace while both crews are watching.', desc:'Make common work the first witness to reconciliation.', chance:'rival_peace',
      success:{ text:'Exhaustion strips the pride from both of you. Hands are clasped in the smoking street, and the feud ends before witnesses.',
        effects:{ opinion:{role:'rival', amt:15}, endRivalry:true, prestige:6, log:'Ended a rivalry after facing a common danger.' } },
      failure:{ text:'{rival} pulls away. “Put out the fire first.” By dawn the moment has gone.',
        effects:{ rivalHeat:-5 } } }
  ]},
{ id:'rival_legacy', title:'An Inherited Quarrel', trigger:{ never:true },
  text:'{rival} was the enemy of the one whose place you have taken. Kin wait to hear whether the old injury belongs to the whole house now — or whether it will be buried with the dead.',
  options:[
    { label:'“That quarrel was not mine.”', desc:'Give the next generation a clean beginning.',
      effects:{ endRivalry:true, piety:3, log:'Buried an inherited feud.' } },
    { label:'“An injury to this house is mine.”', desc:'Take up the feud and the obligations of the dead.',
      effects:{ rivalContact:{role:'rival', score:1, cause:'inherited'}, opinion:{role:'rival', amt:-10}, prestige:5, log:'Inherited a family feud.' } },
    { label:'Offer peace, if they will take it.', desc:'A new heir can say what the dead could not.', chance:'rival_peace',
      success:{ text:'The clean beginning is accepted. Old accusations are withdrawn, and both houses step back from the edge.',
        effects:{ opinion:{role:'rival', amt:15}, endRivalry:true, prestige:3 } },
      failure:{ text:'{rival} has not forgotten enough. The old quarrel finds a new name in you.',
        effects:{ rivalContact:{role:'rival', score:1, cause:'inherited'} } } }
  ]},
{ id:'friend_in_need', title:'A Friend in Need',
  trigger:{ societalRoles:['serf','commoner','gentry'], chance:0.15, hasRole:'friend', goldMin:5 }, weight:5, cooldown:12,
  text:'{friend} comes to you at dusk, shame-faced. A debt is due, and the collector is not a patient man.',
  options:[
    { label:'Pay it. ({money:5})', desc:'A debt forgotten is a friend kept.', effects:{ gold:-5, opinion:{role:'friend', amt:25}, prestige:3 } },
    { label:'Offer sympathy only.', desc:'Kind words pay no collectors.', effects:{ opinion:{role:'friend', amt:-15}, rivalContact:{role:'friend', score:1, cause:'refused_aid'} } }
  ]},

{ id:'sworn_aid', title:'The Oath Remembered',
  trigger:{ societalRoles:['serf','commoner','gentry'], flags:['sworn_friend'], hasRole:'friend', goldMax:3, chance:0.4 }, weight:12, cooldown:12,
  text:'Word of your hard times reaches {friend}. The oath you swore was not words only: they arrive with a purse and no speeches.',
  options:[
    { label:'Take it, and remember.', desc:'Oaths, it turns out, can be eaten.', effects:{ gold:6, opinion:{role:'friend', amt:5} } },
    { label:'Refuse, with thanks.', desc:'Pride costs more than coin, and feeds less.', effects:{ prestige:3, opinion:{role:'friend', amt:10} } }
  ]},
{ id:'devoted_friend', title:'A Friend’s Warning',
  trigger:{ hasRole:'friend', roleOpinionAbove:{role:'friend', value:60}, chance:0.2 }, weight:6, cooldown:12,
  text:'{friend} catches you alone at dusk, glancing over a shoulder. “You have enemies, and I hear things. Watch your back — and take this. You would do the same for me.”',
  options:[
    { label:'Take the gift, and the warning.', desc:'Coin and counsel, from the one who means it.', effects:{ gold:4, opinion:{role:'friend', amt:5} } },
    { label:'“I want nothing I cannot repay.”', desc:'Pride keeps the ledger clean between friends.', effects:{ prestige:3, opinion:{role:'friend', amt:10} } }
  ]},
{ id:'friend_vouch', title:'Standing Surety',
  trigger:{ societalRoles:['serf','commoner','gentry'], hasRole:'friend', roleOpinionAbove:{role:'friend', value:20}, chance:0.15 }, weight:5, cooldown:12,
  text:'{friend} stands before the manor court accused of short-measuring grain. One respected voice swearing to their honesty could settle it — and they are looking at you.',
  options:[
    { label:'Swear to their honesty.', desc:'Your good name, wagered on theirs.', chance:0.6,
      success:{ text:'Your word carries. The charge is dropped, and {friend} will not forget it.', effects:{ opinion:{role:'friend', amt:20}, prestige:2 } },
      failure:{ text:'The measures prove short. Your word carries less than it did yesterday.', effects:{ opinion:{role:'friend', amt:10}, prestige:-5 } } },
    { label:'Stay out of it.', desc:'Their trouble, their verdict.', effects:{ opinion:{role:'friend', amt:-10}, rivalContact:{role:'friend', score:1, cause:'refused_support'} } }
  ]},

/* ---------- plots (resolutions; queued by the Scheming focus) ---------- */
{ id:'plot_discovered', title:'The Web Trembles', trigger:{ never:true },
  contextValidator:'plot_event_context_valid',
  text:'Someone has talked. Conversations die when you approach; eyes follow you out of rooms. The plot is known — or nearly.',
  options:[
    { label:'Abandon everything. Deny everything.',
      desc:'Cut every thread. The endangered relationship or institution will still remember the smoke.',
      effects:{ custom:'plot_discovery_abandon', prestige:-5 } },
    { label:'Buy the evidence and keep weaving. ({money:15})',
      require:{ goldMin:15 },
      desc:'Contain this breach, lose some progress, and accept greater discovery risk from now on.',
      effects:{ gold:-15, custom:'plot_discovery_contain' } },
    { label:'Rush the final stroke NOW.', chance:'plot_discovery', desc:'Strike half-ready, and pray speed makes up for it.',
      success:{ text:'Half-ready proves ready enough — barely. What you sought, you seize, and the talkers fall silent.',
        effects:{ custom:'plot_discovery_success', skills:{int:1} } },
      failure:{ text:'Half-ready is not ready. The whole scheme collapses on your head in daylight.',
        effects:{ custom:'plot_discovery_failure', prestige:-8,
          addModifier:{id:'settlement_grudge'} } } }
  ]},
{ id:'plot_ruin_rival', title:'The Trap Closes', trigger:{ never:true },
  contextValidator:'plot_event_context_valid',
  text:'Every thread is in place and {rival} suspects nothing. One word from you and the web draws tight.',
  options:[
    { label:'Spring the trap.', chance:'plot', desc:'One word, and {rival} falls — if the web holds.',
      success:{ text:'Debts, rumors, and old friends turn all at once. {rival} is ruined — everyone suspects you, and no one can prove it.',
        effects:{ custom:'plot_end', prestige:8, skills:{int:2}, opinion:{role:'rival', amt:-30}, rivalHeat:20, log:'Brought a rival low by intrigue.' } },
      failure:{ text:'A thread snaps — a bought man sells you back. Every neighbor knows whose hand held the knife.',
        effects:{ custom:'plot_end', prestige:-10, opinion:{role:'rival', amt:-20}, rivalHeat:15, popularOpinion:-5 } } },
    { label:'Let it go. Mercy — or nerves.', desc:'A sprung trap can catch the hunter.', effects:{ custom:'plot_end', piety:3, rivalHeat:-10 } }
  ]},
{ id:'plot_spouse_end', title:'The Cup Is Poured', trigger:{ never:true },
  contextValidator:'plot_event_context_valid', charCard:'spouse',
  text:'Everything is in place: the draught measured, the stair loosened, the witnesses elsewhere. {spouse} suspects nothing. One nod from you and it is done.',
  options:[
    { label:'Give the word.', chance:'plot', desc:'One nod, and the house mourns on cue.',
      success:{ text:'A sudden illness, the neighbors say. The house mourns, and none mourn louder than you.',
        effects:{ killRole:'spouse', kinslayer:true, custom:'plot_end', piety:-15, log:'Was widowed — suddenly, conveniently.' } },
      failure:{ text:'The cup is knocked aside — {spouse} reads your face and knows. What lives in your house now is not a marriage but a watch.',
        effects:{ custom:'plot_end', prestige:-15, piety:-10, popularOpinion:-10, opinion:{role:'spouse', amt:-80} } } },
    { label:'Stay your hand.', desc:'Some doors, once opened, never close.', effects:{ custom:'plot_end', piety:5, log:'Abandoned a dark design.' } }
  ]},
{ id:'plot_fabricate_claim', title:'A Charter from the Dust', trigger:{ never:true },
  contextValidator:'plot_event_context_valid',
  text:'The ink is dry, the seals are warm, and three well-paid witnesses remember that {cname} belonged to your forebears. Only the final recital before the court remains.',
  options:[
    { label:'Present the charter.', chance:'fabricate_claim',
      desc:'Intrigue, learning, and renown must carry a document older-looking than it is.',
      success:{ text:'The objections tangle and fail. Your right to {cname} is entered into the rolls.',
        effects:{ custom:'fabricate_claim_success', skills:{int:1}, log:'Fabricated a claim to {cname}.' } },
      failure:{ text:'A witness changes his story. The seals are named false, and the charter is torn in open court.',
        effects:{ custom:'fabricate_claim_failure' } } },
    { label:'Burn it before anyone reads it.', desc:'Abandon the scheme without testing the lie.',
      effects:{ custom:'plot_end' } }
  ]},
{ id:'plot_tithe_barn', title:'The Barn at Midnight', trigger:{ never:true },
  contextValidator:'plot_event_context_valid',
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
  contextValidator:'plot_event_context_valid',
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
  contextValidator:'plot_event_context_valid',
  text:'The false ledger is perfect — every hide and hearth accounted for, and a fifth of it quietly missing.',
  options:[
    { label:'Send the false count.', chance:'plot', desc:'The difference is yours — if no clerk looks twice.',
      success:{ text:'The liege’s clerks stamp it without a second glance. The difference is yours, this year and after.',
        effects:{ custom:'plot_end', gold:25, skills:{int:2} } },
      failure:{ text:'An honest clerk — the rarest hazard. The liege’s displeasure arrives with an audit.',
        effects:{ custom:'plot_end', gold:-15, opinionLiege:-25, prestige:-8,
          addModifier:{id:'contested_tolls'} } } },
    { label:'Burn the false ledger.', desc:'Ashes make poor evidence.', effects:{ custom:'plot_end', piety:3 } }
  ]},
{ id:'plot_guild_monopoly', title:'The Charter’s Hidden Ledger',
  trigger:{ never:true }, contextValidator:'plot_event_context_valid',
  text:'The duplicate accounts are finally in your hands. Fees vanish, weights change after dusk, and the monopoly’s public promises lead to private purses. The charter can be broken, milked, or defended.',
  options:[
    { label:'Publish the accounts and break the charter.', chance:'plot',
      desc:'End this exact monopoly, gain Common Voice, and make enemies of those it favored.',
      success:{ text:'The figures survive every challenge. The charter is struck down before a jeering hall.',
        effects:{ custom:'plot_guild_expose', skills:{int:1}, prestige:3 } },
      failure:{ text:'A missing leaf turns proof into insinuation. The charter’s defenders name you a liar.',
        effects:{ custom:'plot_guild_failure', prestige:-8, popularOpinion:-4 } } },
    { label:'Take compensation and keep the charter.',
      desc:'The monopoly survives. Coin buys your silence, while the public pays the price.',
      effects:{ custom:'plot_guild_compensation' } },
    { label:'Defend the privilege before the guild.',
      desc:'Preserve the charter and gain guild support at the Common Voice’s expense.',
      effects:{ custom:'plot_guild_defend' } },
    { label:'Burn the duplicate accounts.', desc:'Leave the charter and its enemies untouched.',
      effects:{ custom:'plot_end' } }
  ]},
{ id:'plot_rival_claimant', title:'The Rival’s Vulnerable Thread',
  trigger:{ never:true }, contextValidator:'plot_event_context_valid',
  text:'The witnesses are ready and the papers arranged. What began as a private feud now reaches {rival}’s claim, office, Council seat, or royal connection. One public move could make the quarrel political forever.',
  options:[
    { label:'Discredit {rival} in public.', chance:'plot',
      desc:'Attack the real political foothold behind the feud.',
      success:{ text:'Every answer opens another contradiction. {rival}’s political footing gives way before the watching court.',
        effects:{ custom:'plot_rival_discredit', skills:{int:1}, prestige:3 } },
      failure:{ text:'The witnesses contradict one another, then name your purse. {rival} leaves with the stronger grievance.',
        effects:{ custom:'plot_rival_failure', prestige:-10, rivalHeat:5 } } },
    { label:'Offer a witnessed settlement instead. ({money:10})',
      require:{ goldMin:10 },
      desc:'Spend coin and hard-won leverage to end the feud without inventing another enemy.',
      effects:{ gold:-10, custom:'plot_rival_settlement' } },
    { label:'Keep the dossier and sharpen the feud.',
      desc:'Gain intrigue and public leverage, but drive the rivalry toward its dangerous end.',
      effects:{ custom:'plot_rival_dossier' } },
    { label:'Let the papers rot.', desc:'The political opening closes; the feud remains.',
      effects:{ custom:'plot_end', rivalHeat:-5 } }
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
  text:{ forms:{ select:'value', param:'societalRole', cases:{
    serf:'The feast-ale flows, songs get louder, and someone insults someone’s mother. Fists are already rising.',
    commoner:'The ale flows, songs get louder, and a tradesman answers an insult with an overturned bench.',
    gentry:'The manor feast runs late. Two guests forget their manners and reach for each other across the board.',
    lord:'A feast in your hall turns sour when two retainers trade insults and half the company chooses sides.',
    crowned:'At the royal feast, a drunken quarrel between great men threatens to become a public disgrace.',
    other:'Drink loosens tongues until a quarrel threatens the whole gathering.'
  }}},
  options:[
    { label:'Wade in swinging.', require:{ societalRoles:['serf','commoner','gentry'] },
      chance:0.55, desc:'Glory or a ditch — the ale decides.',
      success:{ text:'You crack heads and emerge grinning, a small legend by morning.', effects:{ prestige:4, skills:{mar:1} } },
      failure:{ text:'You wake in a ditch, short a pouch and long a black eye.', effects:{ gold:-3, health:-1 } } },
    { label:'Leave before it worsens.', desc:'No songs are sung about the one who leaves early.', effects:{ } },
    { label:'Talk them all down.', chance:0.5, desc:'A cool tongue could spare many teeth — including yours.',
      success:{ text:'Somehow, you turn rage to laughter. Men remember it.', effects:{ prestige:5, skills:{dip:1} } },
      failure:{ text:'A stray fist finds you anyway.', effects:{ health:-1 } } },
    { label:'Order the hall cleared.', require:{ societalRoles:['lord','crowned'] },
      desc:'End the spectacle with unmistakable authority.',
      effects:{ prestige:4, popularOpinion:-2 } }
  ]},
/* ---------- items: peddlers, offers, and finds ---------- */
{ id:'peddler_knock', title:'The Peddler’s Pack',
  trigger:{ minAge:16, goldMin:15, chance:0.08 }, weight:4, cooldown:16,
  text:{ forms:{ select:'value', param:'societalRole', cases:{
    serf:'A peddler with a guarded pack and quick eyes asks, very quietly, after “a buyer of unusual things.”',
    commoner:'A travelling seller with a guarded pack asks whether prosperous households buy curiosities.',
    gentry:'A factor presents himself at the manor gate with one unusual object and a carefully rehearsed provenance.',
    lord:'A licensed merchant asks private audience, claiming to carry something worthy of your collection.',
    crowned:'A foreign factor petitions the household officers for leave to show the crown an object without equal.',
    other:'A guarded seller asks after a buyer of unusual things.'
  }}},
  options:[
    { label:'See what he carries.', desc:'Unusual things find unusual owners.', effects:{ custom:'offer_item' } },
    { label:'Send him on his way.', desc:'Curiosity is cheap; its prizes are not.', effects:{ } }
  ]},
{ id:'item_offer', title:'An Unusual Offer', trigger:{ never:true },
  text:{ forms:{ select:'value', param:'offerClass', cases:{
    aspirational:'From wrappings of oiled cloth comes {item}. The seller unwraps it slowly — such a thing is not shown to every household, and at {money:itemprice} it was plainly not made for your station.',
    other:'From wrappings of oiled cloth comes {item}. The price is {money:itemprice} — and worth it twice over, says the seller, to the right person.'
  }}},
  options:[
    { label:'Buy it. ({money:itemprice})', require:{ custom:'can_afford_item' }, desc:'Heavy coin for a thing that may outlast you.', effects:{ custom:'buy_item' } },
    { label:'Too rich for you.', desc:'Let some other purse be lightened.', effects:{ custom:'clear_item_offer' } }
  ]},
{ id:'artifact_found', title:'Out of the Earth',
  trigger:{ minAge:16, chance:0.03 }, weight:3, cooldown:40,
  text:{ forms:{ select:'value', param:'societalRole', cases:{
    serf:'A plough-share catches; a spade follows. Out of the earth comes a thing of the old times, caked in clay and glinting beneath.',
    commoner:'Laborers clearing a foundation uncover a clay-caked thing from the old times and bring it to you.',
    gentry:'A tenant’s plough uncovers worked metal, and the reeve carries the find to your manor.',
    lord:'Diggers on your demesne uncover something ancient and place it beneath your steward’s seal.',
    crowned:'Workmen on crown land uncover an ancient object. Scholars and clergy both claim the right to judge it.',
    other:'The earth gives up a clay-caked thing from the old times.'
  }}},
  options:[
    { label:'Keep it.', desc:'The earth gives up its secrets rarely.', effects:{ custom:'find_artifact' } },
    { label:'Give it to the {temple}.', desc:'Old things belong to {god}, and the {holy} will remember.', effects:{ piety:12, opinion:{role:'priest', amt:10} } },
    { label:'Sell it quietly.', require:{ societalRoles:['serf','commoner','gentry'] },
      desc:'Clay-caked wonders still fetch bright coin.', effects:{ gold:30, piety:-2 } }
  ]},
{ id:'plot_locked_chest', title:'The Chest Sings', trigger:{ never:true },
  contextValidator:'plot_event_context_valid',
  text:'The household sleeps; the dog knows you now. The chest waits where the steward believes nobody knows.',
  options:[
    { label:'Crack it.', chance:'plot', desc:'One careful hour against the dog’s memory.',
      success:{ text:'Coin — and a bundle wrapped in wool. Whether it holds anything your family lacks remains to be seen.',
        effects:{ custom:'plot_loot', gold:8, piety:-3 } },
      failure:{ text:'The dog remembered its duty after all. You go over the wall torn, and known.',
        effects:{ custom:'plot_end', prestige:-8, popularOpinion:-6, health:-1 } } },
    { label:'Leave it be.', desc:'Some chests are best left singing.', effects:{ custom:'plot_end', piety:3 } }
  ]},

/* ---------- settlements (fired by the "Go into town…" deed) ---------- */
{ id:'visit_village', title:'{settlement}', trigger:{ never:true },
  text:'Mud lanes, low roofs, and every face turning to mark the newcomer. {settlement} is small enough that nothing here goes unnoticed — including you.',
  options:[
    { label:'Trade at the village green.', require:{ societalRoles:['serf','commoner','gentry'] },
      desc:'Small coin, but honest.', effects:{ gold:2 } },
    { label:'Share news at the well.', require:{ societalRoles:['serf','commoner','gentry'] },
      desc:'Gossip is a currency too.', effects:{ skills:{dip:1}, worldNews:true } },
    { label:'Preach to the villagers.', require:{ professions:['monk','priest'] }, desc:'A ready ear is a small congregation.', effects:{ piety:4, popularOpinion:2 } },
    { label:'Hear the villagers’ grievances.', require:{ tierMin:3 }, desc:'The smallfolk remember who listened.', effects:{ popularOpinion:4, prestige:1 } },
    { label:'Rest at the ale-house. ({money:2})',
      require:{ societalRoles:['serf','commoner','gentry'], religionGroups:['christian','pagan','jewish'], goldMin:2 },
      desc:'A bench, a cup, an hour’s peace.', effects:{ health:1, gold:-2 } },
    { label:'Rest at the way-house. ({money:2})',
      require:{ societalRoles:['serf','commoner','gentry'], religionGroups:['muslim'], goldMin:2 },
      desc:'A quiet corner and a full cup.', effects:{ health:1, gold:-2 } },
    { label:'Inspect the reeve’s accounts.', require:{ societalRoles:['lord','crowned'] },
      desc:'A short visit keeps rents and obligations honest.', chance:'skill_ste',
      success:{ text:'The tallies agree once your eye reaches them. The reeve grows suddenly precise.',
        effects:{ gold:4, skills:{ste:1} } },
      failure:{ text:'Every figure has an explanation and none of them quite meet.',
        effects:{ popularOpinion:-2 } } }
  ]},
{ id:'visit_town', title:'{settlement}', trigger:{ never:true },
  text:'Market stalls, a smithy’s clangor, and strangers enough that no one stares. {settlement} has walls of a sort, laws of a sort, and coin for those who know their trade.',
  options:[
    { label:'Sell at the market.', require:{ societalRoles:['serf','commoner','gentry'] },
      chance:0.65, desc:'Good coin if the buyers are hungry.',
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
    { label:'Court the town’s notables.', require:{ societalRoles:['gentry','lord'] }, desc:'Useful names are learned over wine.', effects:{ prestige:3, skills:{dip:1} } },
    { label:'Browse arms and useful goods.', require:{ goldMin:10 }, desc:'A town market keeps ordinary gear within reach.', effects:{ custom:'offer_gear' } },
    { label:'Browse the market stalls.', desc:'The stallkeepers spread their season’s stock — buy gear, or sell what the armory no longer needs.', effects:{ custom:'open_item_shop' } },
    { label:'Patronize the guilds. ({money:5})', require:{ societalRoles:['lord','crowned'], goldMin:5 },
      desc:'Let the masters associate prosperity with your name.',
      effects:{ gold:-5, prestige:4, popularOpinion:3 } }
  ]},
{ id:'visit_city', title:'{settlement}', trigger:{ never:true },
  text:'Gates like cliffs, streets like rivers. In {settlement} a fortune is made or lost every day, and nobody asks where you were born — only what you carry.',
  options:[
    { label:'Trade in the great market.', require:{ societalRoles:['serf','commoner','gentry'] },
      chance:0.6, desc:'Fortunes turn fast here, in both directions.',
      success:{ text:'The great market swallows all you brought and asks for more.', effects:{ gold:6, skills:{ste:1} } },
      failure:{ text:'A cutpurse thinner than a shadow. You feel the lightness at the gate.', effects:{ gold:-2 } } },
    { label:'Seek out a scholar’s teaching.', desc:'The city keeps wisdom for those who ask.', effects:{ skills:{lea:1}, research:2 } },
    { label:'Petition at the great houses.', require:{ societalRoles:['gentry','lord'] }, chance:0.55, desc:'A name in the right ledger opens doors.',
      success:{ text:'A door opens; a name is taken down. Doors remember.', effects:{ prestige:4, skills:{dip:1} } },
      failure:{ text:'Stewards and secretaries, all day. The great remain unseen.', effects:{ prestige:-1 } } },
    { label:'Hire your blade out.', require:{ professions:['soldier'] }, chance:'battle', desc:'Good pay, if harder men don’t want it too.',
      success:{ text:'Three nights guarding a nervous silk merchant. The pay is very good.', effects:{ gold:6, prestige:2 } },
      failure:{ text:'The work went to harder men — after one of them rearranged your face.', effects:{ health:-1 } } },
    { label:'Marvel at the great {temple}.', desc:'Stone raised to heaven lifts the heart with it.', effects:{ piety:4 } },
    { label:'Browse arms and useful goods.', require:{ goldMin:10 }, desc:'A city market always has serviceable gear for sale.', effects:{ custom:'offer_gear' } },
    { label:'Walk the great bazaar.', desc:'Stall upon stall of gear and goods — buy from the season’s stock, or sell what the armory no longer needs.', effects:{ custom:'open_item_shop' } },
    { label:'Wander the pleasure quarter.', require:{ religionGroups:['christian','pagan','jewish'] }, desc:'Wine, music, and thinner pockets by morning.',
      effects:{ health:1, gold:-2, piety:-3 } },
    { label:'Linger in the bath-houses.', require:{ religionGroups:['muslim'] }, desc:'Steam soaks the road out of tired bones.',
      effects:{ health:1, gold:-1 } },
    { label:'Receive the civic delegation.', require:{ societalRoles:['lord','crowned'] },
      desc:'Hear merchants, clergy, and magistrates together.',
      effects:{ prestige:5, popularOpinion:3, skills:{dip:1} } }
  ]},

/* ---------- childhood (a minor heir's years) ----------
   While the player is under 16 the engine fires ONLY childhood:true events,
   so every event here gates maxAge:15 and carries the tag. */
{ id:'child_lessons', title:'Letters in the Dust',
  trigger:{ maxAge:15, minAge:6, societalRoles:['serf','commoner'], chance:0.3 }, childhood:true, weight:8, cooldown:8,
  text:'The {holy} traces letters in the dust with a stick and looks at you expectantly. Few children are offered even this much.',
  options:[
    { label:'Trace them until they stay.', desc:'Letters learned young are kept for life.', effects:{ skills:{lea:1}, piety:2, opinion:{role:'priest', amt:5} } },
    { label:'Slip away to the fields.', desc:'Sunshine teaches its own lessons.', effects:{ health:1, opinion:{role:'priest', amt:-3} } }
  ]},
{ id:'child_dare', title:'The Dare',
  trigger:{ maxAge:15, minAge:6, societalRoles:['serf','commoner'], chance:0.25 }, childhood:true, weight:7, cooldown:6,
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
  trigger:{ maxAge:15, minAge:6, societalRoles:['serf','commoner'], chance:0.2 }, childhood:true, weight:7, cooldown:8,
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
  trigger:{ maxAge:15, minAge:6, societalRoles:['serf','commoner'], seasons:[1], chance:0.3 }, childhood:true, weight:7, cooldown:8,
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
  trigger:{ maxAge:15, minAge:6, societalRoles:['serf','commoner'], chance:0.25 }, childhood:true, weight:7, cooldown:6,
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

{ id:'child_tutor_household', title:'The Tutor’s Measure',
  trigger:{ maxAge:15, minAge:6, societalRoles:['gentry','lord','crowned'], chance:0.3 },
  childhood:true, weight:8, cooldown:7,
  text:'Your tutor closes the book and asks you to explain the lesson without its words before you. A household may inherit land; it cannot inherit judgment.',
  options:[
    { label:'Reason it through.', desc:'Understanding lasts longer than recitation.', effects:{ skills:{lea:1} } },
    { label:'Turn the lesson toward practical accounts.', desc:'Every principle eventually reaches a ledger.', effects:{ skills:{ste:1} } }
  ]},
{ id:'child_high_table', title:'At the High Table',
  trigger:{ maxAge:15, minAge:7, societalRoles:['gentry','lord','crowned'], chance:0.25 },
  childhood:true, weight:7, cooldown:7,
  text:'Every glance at the high table carries meaning: who sits, who waits, whose cup is filled first. Tonight you are expected to notice all of it and offend no one.',
  options:[
    { label:'Mind every courtesy.', desc:'Grace is discipline made invisible.', effects:{ skills:{dip:1}, prestige:1 } },
    { label:'Watch who whispers to whom.', desc:'Manners hide as much as they reveal.', effects:{ skills:{int:1} } }
  ]},
{ id:'child_falconry', title:'The Young Hawk',
  trigger:{ maxAge:15, minAge:8, societalRoles:['gentry','lord','crowned'], chance:0.22 },
  childhood:true, weight:7, cooldown:8,
  text:'A young hawk sits restless upon your glove, all hunger, fear, and sharp attention. The falconer waits to see whether you command or merely clutch.',
  options:[
    { label:'Hold steady and loose it cleanly.', chance:0.65, desc:'Patience first; the flight follows.',
      success:{ text:'The hawk circles once, then falls exactly where your hand directed.', effects:{ prestige:3, skills:{mar:1} } },
      failure:{ text:'The jesses tangle and the hawk leaves a bright line across your wrist.', effects:{ health:-1 } } },
    { label:'Learn the creature before commanding it.', desc:'Temper understood is temper governed.', effects:{ skills:{dip:1} } }
  ]},
{ id:'child_lineage_arms', title:'Names Upon the Wall',
  trigger:{ maxAge:15, minAge:8, societalRoles:['gentry','lord','crowned'], chance:0.2 },
  childhood:true, weight:7, cooldown:9,
  text:'Painted arms and remembered names line the hall. An elder points from one ancestor to the next, then asks what duty such a lineage lays upon you.',
  options:[
    { label:'Make the name greater.', desc:'Inheritance is a challenge, not a cushion.', effects:{ prestige:4 } },
    { label:'Learn where every claim began.', desc:'Old rights reward a careful memory.', effects:{ skills:{lea:1} } },
    { label:'Remember the disgraces too.', desc:'A house learns most from what it would hide.', effects:{ skills:{int:1}, piety:2 } }
  ]},

{ id:'old_age_reflection', title:'The Long Look Back',
  trigger:{ minAge:55, chance:0.2 }, weight:4, once:true,
  text:{ forms:{ select:'value', param:'societalRole', cases:{
    serf:'Your hands ache with old labors. Children you knew as babes now have grey in their beards. What remains, when the body fails?',
    commoner:'Your hands remember work they can no longer perform. Apprentices have become masters. What remains, when the body fails?',
    gentry:'The manor has changed around you, repaired by hands younger than yours. What remains, when the body fails?',
    lord:'You have judged quarrels, raised banners, and watched heirs grow beneath your roof. What remains, when the body fails?',
    crowned:'Crowns outlive their wearers, and realms remember selectively. What remains when the body fails and rule passes on?',
    other:'Years have gathered behind you. What remains, when the body fails?'
  }}},
  options:[
    { label:'My name. My blood. My house.', desc:'Let the line carry what the body cannot.', effects:{ prestige:10 } },
    { label:'My soul, made ready.', desc:'Set your accounts with {god} in order.', effects:{ piety:10 } },
    { label:'Nothing. So enjoy the wine.', require:{ religionGroups:['christian','pagan','jewish'] }, desc:'Eat, drink; the rest is smoke.', effects:{ health:1, piety:-5 } },
    { label:'Nothing. So savor the days that remain.', require:{ religionGroups:['muslim'] }, desc:'Each morning is a gift unearned.', effects:{ health:1, piety:-5 } }
  ]},

/* ---------- distraint & debt bondage (docs/designs/descent.md) ----------
   A defaulted loan outliving its grace becomes a writ of distraint: pay,
   yield goods, or stall and face the bailiffs. A family with nothing left
   to take faces a station-specific last claim: manor forfeiture for gentry,
   bondage for freeholders, or extraordinary labor for an existing serf. */
{ id:'distraint_writ', title:'A Writ of Distraint',
  trigger:{ tierMax:2, minAge:16, notFlags:['debt_distraint'], custom:'finance_in_default', chance:0.3 }, weight:10, cooldown:2,
  text:'The creditor has been to the lord’s court, and the court has listened. Two men with a writ wait by your door, patient as stones: the debt is called, every penny of it, and the law of the manor is on their side of it.',
  options:[
    { label:'Pay off the debt.', require:{ custom:'distraint_can_settle' }, desc:'Every penny, here and now — and the writ burns.',
      effects:{ custom:'distraint_settle', log:'Paid off a called debt.' } },
    { label:'Yield goods toward the debt.', require:{ custom:'distraint_can_yield' }, desc:'Hand over what will quiet them — a holding, a plot — and keep the rest.',
      effects:{ custom:'distraint_yield_one', log:'Yielded goods toward a called debt.' } },
    { label:'Stall them.', desc:'“Come back after the harvest.” They will — with more men.',
      effects:{ setFlag:'debt_distraint', prestige:-2 } }
  ]},
{ id:'distraint_seizure', title:'The Bailiffs Come',
  trigger:{ tierMax:2, minAge:16, flags:['debt_distraint'], custom:'finance_in_default', chance:0.4 }, weight:14, cooldown:1,
  text:'They came at first light with the writ and a cart: the bailiff, two porters, and the reeve to see it done lawfully. What the debt is owed, the household holds — and they mean to carry it away piece by piece.',
  options:[
    { label:'Open the doors.', desc:'Let them take what the law says is owed. Hiding goods from a writ costs more than goods.',
      effects:{ custom:'distraint_seize', log:'Distrained for debt.' } },
    { label:'Pay them off on the doorstep.', require:{ custom:'distraint_can_settle' }, desc:'Coin, counted out in the mud — and the cart goes home empty.',
      effects:{ custom:'distraint_settle', log:'Paid off a called debt on the doorstep.' } },
    { label:'Bar the door and dare the writ.', desc:'The law has long arms, but today it has only two porters.', chance:0.4,
      success:{ text:'Shouting, shoving, a slammed door — and they withdraw, vowing to return. You have won a season, no more.', effects:{ prestige:-3, popularOpinion:-3 } },
      failure:{ text:'The door gives. So does your lip. They take what the writ allows, and a little dignity besides.', effects:{ health:-1, custom:'distraint_seize' } } }
  ]},
{ id:'manor_forfeit', title:'The Manor Forfeit', trigger:{ never:true },
  contextValidator:'finance_in_default',
  text:'The bailiffs have taken every movable claim they can find, yet the debt remains. The creditor now claims the manor itself. Its surrender will clear the account, but your house will no longer possess the estate that made it gentle.',
  options:[
    { label:'Surrender the manor.', desc:'The debt is extinguished. Your house falls to Freeholder.',
      effects:{ custom:'bondage_submit', log:'Surrendered the manor for debt.' } },
    { label:'Flee beyond the court’s reach.', desc:'Keep your station for now, but carry the debt and default into a new parish.',
      effects:{ custom:'bondage_flee', log:'Fled a final debt judgment.' } }
  ]},
{ id:'bondage_sentence', title:'Bound to the Land', trigger:{ never:true },
  contextValidator:'finance_in_default',
  text:'The bailiffs’ cart is full and the debt still stands. With neither goods nor land left to answer it, the lord’s steward offers the final settlement: the account will be cleared, but your free household will be bound to the lord’s land.',
  options:[
    { label:'Bend your neck to the land.', desc:'The debt is extinguished. Your household becomes Serf.',
      effects:{ custom:'bondage_submit', log:'Bound to the land for debt.' } },
    { label:'Flee in the night.', desc:'A cart, a dark road, a new parish where no one knows your name — or your debts. Both follow you anyway.',
      effects:{ custom:'bondage_flee', log:'Fled a debt-bondage sentence.' } }
  ]},
{ id:'debt_labor_sentence', title:'Labor for the Debt', trigger:{ never:true },
  contextValidator:'finance_in_default',
  text:'The bailiffs find nothing more to take. You are already bound to the lord’s land, so the steward adds extraordinary labor in the demesne fields until the creditor’s claim is satisfied.',
  options:[
    { label:'Accept the extra labor.', desc:'The debt is cleared. Your station does not change.',
      effects:{ custom:'bondage_submit', log:'Worked off a debt in the lord’s fields.' } },
    { label:'Flee in the night.', desc:'Remain a serf, but carry the debt and default into a new parish.',
      effects:{ custom:'bondage_flee', log:'Fled rather than labor for a debt.' } }
  ]}
);
