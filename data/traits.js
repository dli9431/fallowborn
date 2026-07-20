/* =========================================================================
   Fallowborn — TRAITS (moddable)
   skills: dip (diplomacy) mar (martial) ste (stewardship) int (intrigue) lea (learning)
   health: modifier to yearly survival, fert: fertility multiplier
   opinion: how others react to you. opposite: mutually exclusive trait.
   inherit: chance a child is born with it.
   ========================================================================= */
window.FBDATA = window.FBDATA || {};

FBDATA.traits = {
brave:      { name:'Brave', icon:'🦁', desc:'Runs toward the fray.', mar:2, dip:1, opinion:5, opposite:'craven', inherit:0.12 },
craven:     { name:'Craven', icon:'🐀', desc:'Runs from the fray.', mar:-2, opinion:-8, opposite:'brave', inherit:0.12 },
ambitious:  { name:'Ambitious', icon:'🔥', desc:'Wants more. Always more.', dip:1, mar:1, ste:1, int:1, lea:1, opinion:-5, opposite:'content' },
content:    { name:'Content', icon:'🍵', desc:'At peace with their lot.', int:-1, opinion:5, opposite:'ambitious' },
greedy:     { name:'Greedy', icon:'💰', desc:'Gold first, honor second.', ste:2, dip:-1, opinion:-5, opposite:'generous' },
generous:   { name:'Generous', icon:'🎁', desc:'An open hand wins hearts.', ste:-1, dip:2, opinion:8, opposite:'greedy' },
cruel:      { name:'Cruel', icon:'🗡', desc:'Feared, not loved.', int:1, opinion:-12, opposite:'kind' },
kind:       { name:'Kind', icon:'🕊', desc:'Loved, not feared.', dip:2, int:-1, opinion:10, opposite:'cruel', inherit:0.1 },
deceitful:  { name:'Deceitful', icon:'🎭', desc:'Truth is a tool like any other.', int:3, dip:-1, opinion:-8, opposite:'honest' },
honest:     { name:'Honest', icon:'⚖', desc:'Their word is iron.', dip:1, int:-2, opinion:8, opposite:'deceitful' },
lustful:    { name:'Lustful', icon:'💋', desc:'Appetites of the flesh.', fert:1.3, opinion:-3, opposite:'chaste' },
chaste:     { name:'Chaste', icon:'🌸', desc:'Restraint of the flesh.', fert:0.7, lea:1, opinion:3, opposite:'lustful' },
gluttonous: { name:'Gluttonous', icon:'🍖', desc:'The table is a battlefield.', ste:-2, health:-0.005, opinion:-3, opposite:'temperate' },
temperate:  { name:'Temperate', icon:'🥛', desc:'Moderation in all things.', ste:2, health:0.004, opinion:3, opposite:'gluttonous' },
wrathful:   { name:'Wrathful', icon:'⚡', desc:'Quick to fury.', mar:2, dip:-2, int:-1, opinion:-5, opposite:'patient' },
patient:    { name:'Patient', icon:'🐢', desc:'All things in their season.', dip:1, int:1, lea:1, opinion:4, opposite:'wrathful' },
proud:      { name:'Proud', icon:'👑', desc:'Bows to no one gladly.', opinion:-4, opposite:'humble' },
humble:     { name:'Humble', icon:'🙏', desc:'Bends without breaking.', opinion:6, opposite:'proud' },
zealous:    { name:'Zealous', icon:'🕯', desc:'Burning faith.', mar:1, opinion:4, opposite:'cynical' },
cynical:    { name:'Cynical', icon:'🌑', desc:'Believes in little.', int:2, lea:1, opinion:-4, opposite:'zealous' },
genius:     { name:'Genius', icon:'💫', desc:'A mind like lightning.', dip:3, mar:3, ste:3, int:3, lea:3, inherit:0.15 },
quick:      { name:'Quick', icon:'✨', desc:'Sharper than most.', dip:1, mar:1, ste:1, int:1, lea:1, inherit:0.2, opposite:'dull' },
dull:       { name:'Dull', icon:'🐌', desc:'Slow of thought.', dip:-1, mar:-1, ste:-1, int:-1, lea:-1, inherit:0.15, opposite:'quick' },
strong:     { name:'Strong', icon:'💪', desc:'An ox in human form.', mar:2, health:0.006, fert:1.1, inherit:0.15, opposite:'frail' },
frail:      { name:'Frail', icon:'🍂', desc:'A weak constitution.', mar:-2, health:-0.008, inherit:0.12, opposite:'strong' },
comely:     { name:'Comely', icon:'🌹', desc:'Fair of face.', dip:1, fert:1.15, opinion:8, inherit:0.18, opposite:'homely' },
homely:     { name:'Homely', icon:'🥔', desc:'Plain of face.', opinion:-5, inherit:0.12, opposite:'comely' },
sickly:     { name:'Sickly', icon:'🤒', desc:'Illness clings to them.', health:-0.015, fert:0.8, inherit:0.1 },
robust:     { name:'Robust', icon:'🌳', desc:'Rarely ill a day.', health:0.01, inherit:0.1 },
drunkard:   { name:'Drunkard', icon:'🍺', desc:'The cup rules them.', ste:-2, dip:-1, health:-0.006, opinion:-5 },
scarred:    { name:'Scarred', icon:'⚔', desc:'Marked by battle.', opinion:3 },
one_eyed:   { name:'One-Eyed', icon:'🩹', desc:'Lost an eye — gained a story.', mar:-1, opinion:2 },
maimed:     { name:'Maimed', icon:'🦯', desc:'Broken in body.', mar:-3, health:-0.01, opinion:-3 },
literate:   { name:'Lettered', icon:'📜', desc:'Can read and write — rare gift.', lea:2, ste:1 },
veteran:    { name:'Veteran', icon:'🛡', desc:'Survived the shield-wall.', mar:2, opinion:5 },
pilgrim:    { name:'Pilgrim', icon:'🐚', desc:'Walked the holy roads.', lea:1, opinion:4 },
kinslayer:  { name:'Kinslayer', icon:'🩸', desc:'Blood of their own blood.', opinion:-20 },
excommunicated: { name:'Excommunicated', icon:'⛓', desc:'Cast out by the church.', opinion:-15 }
};
