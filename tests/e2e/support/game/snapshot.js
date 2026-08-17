'use strict';

async function lifeSnapshot(page) {
  return page.evaluate(function () {
    const state = FB.state;
    const player = state.player;
    const character = state.chars[player.charId];
    return {
      seed:state.seed,
      start:JSON.parse(JSON.stringify(state.start)),
      date:JSON.parse(JSON.stringify(state.date)),
      turn:state.turn,
      rng:FB.getRngState(),
      uid:FB.getUidCounter(),
      player:{
        charId:player.charId,
        tier:player.tier,
        profession:player.profession,
        gold:player.gold,
        prestige:player.prestige,
        piety:player.piety,
        provinceId:player.provinceId,
        focus:player.focus
      },
      character:{
        id:character.id,
        name:character.name,
        sex:character.sex,
        culture:character.culture,
        religion:character.religion,
        born:character.born,
        dyn:character.dyn,
        traits:character.traits.slice()
      }
    };
  });
}

module.exports = {
  lifeSnapshot:lifeSnapshot
};
