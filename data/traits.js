/* =========================================================================
   Fallowborn — TRAITS (moddable)
   skills: dip (diplomacy) mar (martial) ste (stewardship) int (intrigue) lea (learning)
   health: modifier to yearly survival, fert: fertility multiplier
   opinion: how others react to you. opposite: mutually exclusive trait.
   inherit: chance a child is born with it.
   class: disposition | formation | reputation | condition.
   noRandom: exclude from ordinary character generation.
   earned: localized acquisition guidance; earn.threshold awards from progress.
   Named effect groups are summed by FB.traitBonus(character, group, key).
   ========================================================================= */
window.FBDATA = window.FBDATA || {};

FBDATA.traits = {
brave:      { name:'Brave', icon:'🦁', 'class':'disposition', desc:'Runs toward the fray.', mar:2, dip:1, opinion:5, opposite:'craven', inherit:0.12 },
craven:     { name:'Craven', icon:'🐀', 'class':'disposition', desc:'Runs from the fray.', mar:-2, opinion:-8, opposite:'brave', inherit:0.12 },
ambitious:  { name:'Ambitious', icon:'🔥', 'class':'disposition', desc:'Wants more. Always more.', dip:1, mar:1, ste:1, int:1, lea:1, opinion:-5, opposite:'content', courtship:{ siblingDynasticInitiate:1, siblingDynasticAccept:0.15, siblingDynasticProposal:0.08 } },
content:    { name:'Content', icon:'🍵', 'class':'disposition', desc:'At peace with their lot.', int:-1, opinion:5, opposite:'ambitious', courtship:{ siblingDynasticAccept:-0.15, siblingDynasticProposal:-0.08 } },
greedy:     { name:'Greedy', icon:'💰', 'class':'disposition', desc:'Money first, honor second.', ste:2, dip:-1, opinion:-5, opposite:'generous' },
generous:   { name:'Generous', icon:'🎁', 'class':'disposition', desc:'An open hand wins hearts.', ste:-1, dip:2, opinion:8, opposite:'greedy' },
cruel:      { name:'Cruel', icon:'🗡', 'class':'disposition', desc:'Feared, not loved.', int:1, opinion:-12, opposite:'kind' },
kind:       { name:'Kind', icon:'🕊', 'class':'disposition', desc:'Loved, not feared.', dip:2, int:-1, opinion:10, opposite:'cruel', inherit:0.1 },
deceitful:  { name:'Deceitful', icon:'🎭', 'class':'disposition', desc:'Truth is a tool like any other.', int:3, dip:-1, opinion:-8, opposite:'honest', courtship:{ siblingInitiate:1, siblingIllicitAccept:0.10, siblingProposal:0.05, siblingExposure:-0.02 } },
honest:     { name:'Honest', icon:'⚖', 'class':'disposition', desc:'Their word is iron.', dip:1, int:-2, opinion:8, opposite:'deceitful', courtship:{ siblingInitiate:-1, siblingIllicitAccept:-0.10, siblingProposal:-0.05, siblingExposure:0.02 } },
lustful:    { name:'Lustful', icon:'💋', 'class':'disposition', desc:'Appetites of the flesh.', fert:1.3, opinion:-3, opposite:'chaste', courtship:{ siblingInitiate:2, siblingAccept:0.25, siblingProposal:0.12 } },
chaste:     { name:'Chaste', icon:'🌸', 'class':'disposition', desc:'Restraint of the flesh.', fert:0.7, lea:1, opinion:3, opposite:'lustful', courtship:{ siblingInitiate:-2, siblingAccept:-0.35, siblingProposal:-0.15 } },
gluttonous: { name:'Gluttonous', icon:'🍖', 'class':'disposition', desc:'The table is a battlefield.', ste:-2, health:-0.005, opinion:-3, opposite:'temperate' },
temperate:  { name:'Temperate', icon:'🥛', 'class':'disposition', desc:'Moderation in all things.', ste:2, health:0.004, opinion:3, opposite:'gluttonous' },
wrathful:   { name:'Wrathful', icon:'⚡', 'class':'disposition', desc:'Quick to fury.', mar:2, dip:-2, int:-1, opinion:-5, opposite:'patient' },
patient:    { name:'Patient', icon:'🐢', 'class':'disposition', desc:'All things in their season.', dip:1, int:1, lea:1, opinion:4, opposite:'wrathful' },
proud:      { name:'Proud', icon:'👑', 'class':'disposition', desc:'Bows to no one gladly.', opinion:-4, opposite:'humble' },
humble:     { name:'Humble', icon:'🙏', 'class':'disposition', desc:'Bends without breaking.', opinion:6, opposite:'proud' },
zealous:    { name:'Zealous', icon:'🕯', 'class':'disposition', desc:'Burning faith.', mar:1, opinion:4, opposite:'cynical', courtship:{ siblingRiteInitiate:1, siblingRiteAccept:0.25, siblingRiteProposal:0.12, siblingTabooInitiate:-2, siblingTabooAccept:-0.35, siblingTabooProposal:-0.15 } },
cynical:    { name:'Cynical', icon:'🌑', 'class':'disposition', desc:'Believes in little.', int:2, lea:1, opinion:-4, opposite:'zealous', courtship:{ siblingInitiate:1, siblingTabooAccept:0.15, siblingProposal:0.08 } },
genius:     { name:'Genius', icon:'💫', 'class':'disposition', desc:'A mind like lightning.', dip:3, mar:3, ste:3, int:3, lea:3, inherit:0.15 },
quick:      { name:'Quick', icon:'✨', 'class':'disposition', desc:'Sharper than most.', dip:1, mar:1, ste:1, int:1, lea:1, inherit:0.2, opposite:'dull' },
dull:       { name:'Dull', icon:'🐌', 'class':'disposition', desc:'Slow of thought.', dip:-1, mar:-1, ste:-1, int:-1, lea:-1, inherit:0.15, opposite:'quick' },
strong:     { name:'Strong', icon:'💪', 'class':'condition', desc:'An ox in human form.', mar:2, health:0.006, fert:1.1, inherit:0.15, opposite:'frail' },
frail:      { name:'Frail', icon:'🍂', 'class':'condition', desc:'A weak constitution.', mar:-2, health:-0.008, inherit:0.12, opposite:'strong' },
comely:     { name:'Comely', icon:'🌹', 'class':'condition', desc:'Fair of face.', dip:1, fert:1.15, opinion:8, inherit:0.18, opposite:'homely' },
homely:     { name:'Homely', icon:'🥔', 'class':'condition', desc:'Plain of face.', opinion:-5, inherit:0.12, opposite:'comely' },
sickly:     { name:'Sickly', icon:'🤒', 'class':'condition', desc:'Illness clings to them.', health:-0.015, fert:0.8, inherit:0.1 },
robust:     { name:'Robust', icon:'🌳', 'class':'condition', desc:'Rarely ill a day.', health:0.01, inherit:0.1 },
drunkard:   { name:'Drunkard', icon:'🍺', 'class':'disposition', desc:'The cup rules them.', ste:-2, dip:-1, health:-0.006, opinion:-5 },
scarred:    { name:'Scarred', icon:'⚔', 'class':'condition', desc:'Marked by battle.', earned:'Survive a wound that leaves a lasting scar.', opinion:3, inherit:0, noRandom:true },
one_eyed:   { name:'One-Eyed', icon:'🩹', 'class':'condition', desc:'Lost an eye — gained a story.', earned:'Lose an eye to violence or misfortune.', mar:-1, opinion:2, inherit:0, noRandom:true },
maimed:     { name:'Maimed', icon:'🦯', 'class':'condition', desc:'Broken in body.', earned:'Survive a ruinous injury.', mar:-3, health:-0.01, opinion:-3, inherit:0, noRandom:true },
literate:   { name:'Lettered', icon:'📜', 'class':'formation', desc:'Can read and write — a rare skill that opens learned examinations and advanced trade leadership.', earned:'Learn letters through education, religious study, or a learned apprenticeship.', lea:2, ste:1, inherit:0, noRandom:true, courtship:{ siblingRiteInitiate:1 } },
veteran:    { name:'Veteran', icon:'🛡', 'class':'formation', desc:'Survived the shield-wall.', earned:'Survive the shield-wall or return from distinguished war service.', mar:2, opinion:5, inherit:0, noRandom:true },
pilgrim:    { name:'Pilgrim', icon:'🐚', 'class':'formation', desc:'Walked the holy roads.', earned:'Complete a pilgrimage to a holy place.', lea:1, opinion:4, inherit:0, noRandom:true },
moot_speaker: { name:'Moot-Speaker', icon:'🏛', 'class':'reputation', desc:'A practiced voice among the assembled estates.', earned:'Win three contested votes in the estates.', dip:1, inherit:0, noRandom:true, earn:{threshold:3}, assembly:{voteChance:0.05, popularOpinion:0.20} },
roadwise:   { name:'Roadwise', icon:'🧭', 'class':'formation', desc:'Miles have taught which roads to trust.', earned:'Complete three distinct journeys for pilgrimage, trade, study, or paid service.', ste:1, inherit:0, noRandom:true, earn:{threshold:3}, travel:{legDays:-1, roadIncident:-0.15} },
muster_bred:{ name:'Muster-Bred', icon:'⚔', 'class':'formation', desc:'The levy’s habits have become second nature.', earned:'Earn six points of service in your liege’s wars.', mar:1, inherit:0, noRandom:true, earn:{threshold:6}, war:{levy:0.05} },
rent_shrewd:{ name:'Rent-Shrewd', icon:'🧾', 'class':'reputation', desc:'Few dues escape a well-kept tally.', earned:'Profit from three Rent Days or extraordinary tax collections.', ste:1, inherit:0, noRandom:true, earn:{threshold:3}, estate:{rent:0.10} },
hearth_steady:{ name:'Hearth-Steady', icon:'🔥', 'class':'disposition', desc:'Kin find a sure hand at the household fire.', earned:'Choose three supportive outcomes for spouse or child.', dip:1, inherit:0, noRandom:true, earn:{threshold:3}, household:{regard:0.25} },
kinslayer:  { name:'Kinslayer', icon:'🩸', 'class':'reputation', desc:'Blood of their own blood.', earned:'Directly cause the death of a spouse or blood relative.', opinion:-20, inherit:0, noRandom:true },
scandalous_union: { name:'Scandalous Union', icon:'🕯', 'class':'reputation', desc:'Lives openly in a union forbidden by most neighbors.', earned:'Persist in a close-kin marriage without a rite recognized by the couple’s faith.', opinion:-15, inherit:0, noRandom:true },
simoniac:   { name:'Simoniac', icon:'🪙', 'class':'reputation', desc:'Bought sacred office with silver.', earned:'Purchase a church office after a rejected appointment.', opinion:-10, inherit:0, noRandom:true },
excommunicated: { name:'Excommunicated', icon:'⛓', 'class':'reputation', desc:'Cast out by the church.', earned:'Suffer formal condemnation by your faith’s religious authority.', opinion:-15, inherit:0, noRandom:true }
};

/* =========================================================================
   AILMENTS — named wounds & sicknesses a character carries for a while
   (c.ails; gained from event health loss / setFlag:'ill', cured by time).
   kind: 'wound' heals as health returns; 'sickness' clears with the ill flag.
   mark: portrait cue — 'cut' | 'bruise' | 'bandage' (absent: no face mark;
   sicknesses show as a pale, haggard face instead).
   sev: 1 = minor (dealt by small blows), 2 = severe (health -4 or worse).
   ========================================================================= */
FBDATA.ailments = {
gash:            { name:'A deep gash', icon:'🩸', kind:'wound', mark:'cut', sev:1, desc:'Bled fierce and long before it closed.' },
bruises:         { name:'Bruised flesh', icon:'🟣', kind:'wound', mark:'bruise', sev:1, desc:'Black and blue from hip to brow.' },
cracked_ribs:    { name:'Cracked ribs', icon:'🦴', kind:'wound', sev:1, desc:'Every breath and laugh comes at a price.' },
head_wound:      { name:'A cracked pate', icon:'🤕', kind:'wound', mark:'bandage', sev:2, desc:'The world still rings and tilts.' },
broken_bone:     { name:'A broken bone', icon:'🦴', kind:'wound', mark:'bandage', sev:2, desc:'Set straight, splinted, and slow to knit.' },
festering_wound: { name:'A festering wound', icon:'🤢', kind:'wound', mark:'cut', sev:2, desc:'It weeps and stinks. The leech shakes his head.' },
fever:           { name:'A burning fever', icon:'🤒', kind:'sickness', desc:'Hot as a forge one hour, ice the next.' },
flux:            { name:'The flux', icon:'🤮', kind:'sickness', desc:'The belly rebels and will not be reasoned with.' },
winter_chill:    { name:'A chilling cough', icon:'🥶', kind:'sickness', desc:'A wet cough that settles deep in the chest.' },
pestilence:      { name:'Pestilence', icon:'☠', kind:'sickness', desc:'The great mortality walks, and it stopped here.' }
};
