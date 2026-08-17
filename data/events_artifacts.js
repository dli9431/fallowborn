/* =========================================================================
   Fallowborn — LEGENDARY & SACRED ARTIFACT EVENTS
   One generic rumor → trial chain serves every artifact; the per-artifact
   prose lives in the text forms keyed on the {artifact} context id, and the
   faith/culture/region gating lives on the item definition's `artifact`
   field (data/map_data.js, docs/designs/items.md). A found artifact is
   stamped once per save in state.artifacts; lost or destroyed artifacts
   never re-enter the rumor pool. `artifact_coveted` is the recurring loss
   pressure on a held artifact. See docs/MODDING.md for the event schema.
   ========================================================================= */
window.FBDATA = window.FBDATA || {};
FBDATA.events = FBDATA.events || [];

FBDATA.events.push(

/* ---------- the rumor ---------- */
{ id:'artifact_rumor', title:'A Name Out of Legend',
  trigger:{ minAge:16, chance:0.06 }, weight:2, cooldown:20,
  contextSelector:'artifact_rumors',
  text:{ forms:{ select:'value', param:'artifact', cases:{
    excalibur:'A harper from the west sings of a sword beneath still water in {province}, waiting for a hand the lake approves of. The song is older than the churches here.',
    tyrfing:'A skald drinks too much and talks too freely: a barrow in {province} holds a blade forged by dwarves, cursed to kill whenever it is drawn. He says he never went in. He says it twice.',
    gungnir:'An old one-eyed wanderer — or so the story runs — was seen casting a spear across the northern fells. Where it fell, the spear of the Allfather is said to wait for an arm worthy of the throw.',
    mjolnir_amulet:'A farmer ploughing stony ground turned up an iron hammer on a cord, heavy as a thunderhead. The old folk make the old sign and say Thor marks his own.',
    durendal:'A dying knight of the Marches confesses it at last: Roland’s sword did not stay beneath the rocks of Roncevaux. It passed from hand to fearful hand, and it lies hidden still.',
    zulfiqar:'An aged veteran of the Prophet’s wars tells of the forked blade of Ali — carried from battlefield to treasury to hiding place, and last seen, he swears, in {province}.',
    holy_lance:'A pilgrim back from Constantinople whispers of the Lance that pierced the side at Golgotha — and of the quiet men who would pay any price to learn who truly keeps it.',
    true_cross_fragment:'A monk of Jerusalem, gaunt from the road, carries a secret: a splinter of the True Cross was hidden from the conquerors, and the map to it is dying with him.',
    book_of_kells:'Word travels from the monasteries of the west: the great Gospel book of Columba’s house, its pages bright as jewels, has been moved for fear of raiders — and not everyone who moved it came back.',
    ring_of_solomon:'A dealer in curiosities shows you a drawing, no more: a seal ring of the wise king, cut with the name that binds spirits. The original, he insists, lies closer than anyone believes.',
    derafsh_kaviani:'An exile from the old Persian courts speaks of the smith’s apron-banner that rose against the tyrant Zahhak — the Derafsh Kaviani — lost, hidden, or waiting, depending on which cup of wine he is on.',
    other:'A traveler speaks of a relic out of legend, hidden closer than anyone believes.'
  }}},
  options:[
    { label:'Pursue the rumor.', desc:'Legends do not wait for better times.',
      effects:{ custom:'artifact_rumor_pursue' } },
    { label:'Pay it no mind.', desc:'Some songs are only songs.', effects:{ } }
  ]},

/* ---------- the trial ---------- */
{ id:'artifact_trial', title:'The Claim of Legend', trigger:{ never:true },
  contextValidator:'artifact_trial_valid',
  text:{ forms:{ select:'value', param:'artifact', cases:{
    excalibur:'The lake is cold and still, and the sword’s hilt breaks the water like a reed. The old people watching from the shore say nothing. Whatever rises to meet you, it will judge the hand, not the title.',
    tyrfing:'The barrow opens like a mouth. Inside: a dead king on his bench, and across his knees a blade that gleams without light. The curse is part of the price. It always was.',
    gungnir:'The spear stands upright in a cleft of black rock where no hand could have set it. Ravens watch from every stone. The wind itself seems to wait.',
    mjolnir_amulet:'The amulet hangs in a god-house of the old faith, between carved pillars and watchful eyes. Taking it would be easy. Deserving it is the question the carved faces ask.',
    durendal:'The sword lies in a charcoal-burner’s shrine, wrapped in a rotted banner, its golden hilt heavy with older bones. The village knows what it has, and fears it.',
    zulfiqar:'The blade rests with an old family who guard it as a trust, not a treasure. Their elders will not be threatened — but they can be persuaded, shamed, or bought.',
    holy_lance:'The Lance — if this is the Lance — lies in a chapel treasury under three locks and the gaze of men who have killed for it before. The priest in charge is tired, and rich men are circling.',
    true_cross_fragment:'The monk’s map ends at a cistern beneath a fallen church. Down in the dark, behind the third course of stone, waits a thing kings have marched to possess.',
    book_of_kells:'The book travels by night, from cell to cell, one step ahead of the raiders. The monks who guard it will surrender it only to a hand they trust — or lose it to one they cannot stop.',
    ring_of_solomon:'The ring sits in the strongbox of a money-changer who does not believe the stories and believes the offers. Around his shop, other seekers watch from doorways.',
    derafsh_kaviani:'The banner hangs in a fire temple’s inner court, its silk stiff with gold thread, guarded by priests who remember what it meant — and dream of what it could mean again.',
    other:'The trail ends at a hiding place that has kept its secret for generations. Claiming what lies there will cost coin, courage, or faith.'
  }}},
  options:[
    { label:'Make the proper offering. ({money:artifactprice})',
      require:{ custom:'artifact_can_afford' },
      desc:'Gold opens doors that songs cannot.',
      effects:{ custom:'artifact_offering' } },
    { label:'Take it by strength and daring.', chance:'battle',
      desc:'Risk blood for a legend.',
      success:{ text:'Steel, nerve, and a long moment where the world holds its breath — then the legend is in your hand.',
        effects:{ custom:'artifact_grant' } },
      failure:{ text:'It goes wrong badly and fast. You escape with your life, and little else of yours intact.',
        effects:{ health:-1 } } },
    { label:'Prove your devotion. (25 piety)',
      require:{ custom:'artifact_is_sacred', pietyMin:25 },
      desc:'Fasts, vigils, and gifts to the {temple}, until the guardians believe.',
      effects:{ piety:-25, custom:'artifact_grant' } },
    { label:'Walk away.', desc:'Let the legend keep its secret a while longer.',
      effects:{ } }
  ]},

/* ---------- the price of holding it ---------- */
{ id:'artifact_coveted', title:'Covetous Eyes',
  trigger:{ minAge:16, chance:0.08 }, weight:2, cooldown:16,
  contextSelector:'artifact_held',
  text:{ forms:{ select:'value', param:'artifact', cases:{
    excalibur:'An embassy arrives with soft words and a hard core: a crowned neighbor has heard the lake’s sword rides with your family, and would “give it a keeping worthy of its name.”',
    tyrfing:'A seer warns you, pale to the lips: men who dream of the cursed blade have begun to dream of you. An offer follows within the week — generous, and not really an offer.',
    gungnir:'A war-band of the old faith feasts in your hall and counts the spears on your wall. Their chief names the Allfather’s weapon over the mead, and asks what ransom would buy it.',
    mjolnir_amulet:'A goði of the old faith demands the hammer be “returned to the god’s own house” — his house, naturally — and hints at what refusal will cost your name.',
    durendal:'A bishop writes with honeyed insistence: Roland’s sword belongs in a cathedral treasury, and your family’s “temporary stewardship” has grown notable. Men of consequence are asking after it.',
    zulfiqar:'A delegation of jurists and soldiers arrives: the forked blade, they say, belongs with those who guard the community. Their patience is great. Their entourage is greater.',
    holy_lance:'Prelates and princes have begun writing to each other about your family’s Lance. This week’s letter is addressed to you, and the seal on it is royal.',
    true_cross_fragment:'Patriarchs have heard whispers about the splinter your family keeps. An envoy arrives with a heavy purse and a heavier threat, wrapped in scripture.',
    book_of_kells:'An abbot of great wealth has traced the wandering Gospel book to your hall, and offers gold, prayers, and — quietly — mentions how exposed a single house can be.',
    ring_of_solomon:'Three men have asked after the seal ring this month, each richer and less polite than the last. Tonight a fourth waits in your hall, and he does not look like a buyer.',
    derafsh_kaviani:'Riders from the plateau courts have seen the banner in your keeping. Their lord offers alliance and gold for it — and his letter lists his victories underneath.',
    other:'Powerful men have learned what your family keeps, and one of them has come to “negotiate.”'
  }}},
  options:[
    { label:'Yield it with ceremony.', desc:'A gift that buys peace and renown — and loses the legend forever.',
      effects:{ custom:'artifact_seize', prestige:8 } },
    { label:'Refuse — it is yours by right.', chance:0.5,
      desc:'Some things are not for sale. Not everyone accepts that answer.',
      success:{ text:'They swallow the insult and ride home. For now, the legend stays.',
        effects:{ prestige:-4 } },
      failure:{ text:'Agents in the night, a bribed guard, a reliquary found empty at dawn. The legend has a new keeper.',
        effects:{ custom:'artifact_seize', prestige:-8, popularOpinion:-4 } } }
  ]}

);
