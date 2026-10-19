'use strict';
const { test, expect } = require('../support/fixture');
const { startParityGame } = require('../support/game/parity');
const { dependsOnRuntime } = require('../support/runtime-dependencies');

dependsOnRuntime(__filename, [
  'index.html','data/bookmark_493.js','data/starts_clovis_493.js','data/story_instances.js',
  'js/story_opening_goals.js','js/starts.js','js/main.js','js/world.js','js/model.js',
  'js/mods.js','js/stories.js','js/save.js','js/save_v4.js'
]);

test('an imported profile resolves the adopted court child once and retains that identity after death', async function ({ page }, info) {
  await startParityGame(page, info, { bookmark:'493', scenario:'clovis_493', declaredOpening:true });
  const result = await page.evaluate(function () {
    const s = FB.state, me = s.chars[s.player.charId];
    const child = me.childrenIds.map(function (id) { return s.chars[id]; }).find(function (c) { return c.name === 'Theuderic'; });
    const beforePeople = Object.keys(s.chars).sort(), funds = s.player.gold;
    const declaration = {
      id:'adopted_contact_proof', type:'opening_profile', title:'Existing family', intro:'Ordinary family access',
      scenarioIds:['clovis_493'], provinceIds:['laon'],
      goals:[{ id:'reserve', name:'Keep savings', text:'Keep a private reserve', criterion:{ kind:'reserve', amount:100000 } }],
      contacts:[
        { id:'child', label:'The existing child', text:'An ordinary kin link', linkKind:'kin', required:true,
          person:{ source:'royal_member', realmId:'franks_493', memberId:'theuderic' } },
        { id:'absent', label:'An absent relative', text:'No replacement', linkKind:'kin', required:false,
          person:{ source:'royal_member', realmId:'franks_493', memberId:'unrecorded' } }
      ]
    };
    FB.mods.apply({ name:'Adopted contact proof', storyInstances:{ adopted_contact_proof:declaration } });
    FB.stories.start(s, { tracks:['adopted_contact_proof'] }); FB.openingGoals.start(s);
    const t = s.stories.adopted_contact_proof, story = FB.stories.get('adopted_contact_proof');
    const contact = t.contacts.child, resolved = contact === child.id, missing = t.contacts.absent === null;
    const unchanged = JSON.stringify(beforePeople) === JSON.stringify(Object.keys(s.chars).sort()) && funds === s.player.gold;
    const before = JSON.stringify(s), rng = FB.getRngState(), uid = FB.getUidCounter();
    story.people(s,t); FB.stories.status(s,story.id);
    const pure = before === JSON.stringify(s) && rng === FB.getRngState() && uid === FB.getUidCounter();
    const record = JSON.stringify(t), saved = JSON.parse(FB.save.serialize()); FB.save.restore(saved);
    const retained = record === JSON.stringify(FB.state.stories.adopted_contact_proof);
    FB.killChar(FB.state, FB.state.chars[contact]); FB.openingGoals.start(FB.state);
    const people = story.people(FB.state,FB.state.stories.adopted_contact_proof);
    return { compactRemoved:!s.realms.player.succession, resolved:resolved, missing:missing, unchanged:unchanged,
      pure:pure, retained:retained, deadLink:FB.state.stories.adopted_contact_proof.contacts.child === contact &&
        people[0].characterId === contact && !!people[0].reason,
      noFriend:!(FB.state.player.friendContacts || {})[contact] };
  });
  expect(result).toEqual({ compactRemoved:true, resolved:true, missing:true, unchanged:true,
    pure:true, retained:true, deadLink:true, noFriend:true });
});
